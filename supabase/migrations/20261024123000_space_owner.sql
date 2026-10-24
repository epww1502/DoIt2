-- 공간장: 만든 사람이 공간장. 공간장은 다른 멤버에게 넘겨줄 수 있고, 멤버를 내보내고, 초대 코드를 바꿀 수 있다.
alter table public.spaces add column owner_id uuid references auth.users (id) on delete set null;

-- 지금 있는 공간: 만든 사람이 아직 멤버면 그 사람, 아니면 가장 먼저 들어온 사람
update public.spaces s
set owner_id = coalesce(
  (select m.user_id from public.space_members m where m.space_id = s.id and m.user_id = s.created_by),
  (select m.user_id from public.space_members m where m.space_id = s.id order by m.joined_at limit 1)
);

-- 멤버는 이름·아이콘·사진만 바꿀 수 있다 (공간장·초대 코드는 아래 함수로만)
revoke update on public.spaces from authenticated;
grant update (name, emoji, image_path) on public.spaces to authenticated;

-- 지금 공간장 (공간장 계정이 지워졌으면 가장 먼저 들어온 멤버)
create function public.space_owner (target_space uuid)
  returns uuid language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select s.owner_id from public.spaces s
      join public.space_members m on m.space_id = s.id and m.user_id = s.owner_id
      where s.id = target_space),
    (select m.user_id from public.space_members m where m.space_id = target_space order by m.joined_at limit 1)
  );
$$;
revoke execute on function public.space_owner (uuid) from public, anon;

create or replace function public.create_space (space_name text, space_emoji text)
  returns public.spaces language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid ();
  result public.spaces;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if (select count(*) from public.space_members where user_id = uid) >= 20 then
    raise exception 'too_many_spaces' using errcode = 'P0001';
  end if;

  insert into public.spaces (name, emoji, invite_code, created_by, owner_id)
  values (
    coalesce(nullif(trim(space_name), ''), '우리 공간'),
    coalesce(nullif(trim(space_emoji), ''), '💞'),
    public.generate_invite_code (),
    uid,
    uid
  )
  returning * into result;

  insert into public.space_members (space_id, user_id) values (result.id, uid);
  return result;
end;
$$;

-- 나가기: 공간장이 나가면 가장 먼저 들어온 사람이 공간장이 된다
create or replace function public.leave_space (target_space uuid)
  returns void language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid ();
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  delete from public.space_members where space_id = target_space and user_id = uid;

  if not exists (select 1 from public.space_members where space_id = target_space) then
    delete from public.spaces where id = target_space;
  else
    update public.spaces
    set owner_id = (select m.user_id from public.space_members m
                    where m.space_id = target_space order by m.joined_at limit 1)
    where id = target_space and (owner_id is null or owner_id = uid);
  end if;
end;
$$;

-- 공간장 넘겨주기 (공간장만)
create function public.transfer_space_owner (target_space uuid, new_owner uuid)
  returns void language plpgsql security definer set search_path = ''
as $$
begin
  if public.space_owner (target_space) is distinct from auth.uid () then
    raise exception 'not_owner' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.space_members where space_id = target_space and user_id = new_owner) then
    raise exception 'not_member' using errcode = 'P0001';
  end if;
  update public.spaces set owner_id = new_owner where id = target_space;
end;
$$;

-- 멤버 내보내기 (공간장만, 자기 자신은 안 됨)
create function public.kick_space_member (target_space uuid, member uuid)
  returns void language plpgsql security definer set search_path = ''
as $$
begin
  if public.space_owner (target_space) is distinct from auth.uid () then
    raise exception 'not_owner' using errcode = 'P0001';
  end if;
  if member = auth.uid () then
    raise exception 'cannot_kick_self' using errcode = 'P0001';
  end if;
  delete from public.space_members where space_id = target_space and user_id = member;
end;
$$;

-- 초대 코드 바꾸기 (공간장만). 내보낸 사람이 예전 코드로 다시 못 들어오게
create function public.reset_invite_code (target_space uuid)
  returns text language plpgsql security definer set search_path = ''
as $$
declare
  new_code text;
begin
  if public.space_owner (target_space) is distinct from auth.uid () then
    raise exception 'not_owner' using errcode = 'P0001';
  end if;
  new_code := public.generate_invite_code ();
  update public.spaces set invite_code = new_code where id = target_space;
  return new_code;
end;
$$;

revoke execute on function public.transfer_space_owner (uuid, uuid) from public, anon;
revoke execute on function public.kick_space_member (uuid, uuid) from public, anon;
revoke execute on function public.reset_invite_code (uuid) from public, anon;
grant execute on function public.transfer_space_owner (uuid, uuid) to authenticated;
grant execute on function public.kick_space_member (uuid, uuid) to authenticated;
grant execute on function public.reset_invite_code (uuid) to authenticated;

-- 멤버 목록에 공간장 표시를 더한다
drop function public.space_member_profiles (uuid);
create function public.space_member_profiles (target_space uuid)
  returns table (
    user_id uuid, nickname text, avatar_path text, is_me boolean, is_owner boolean, show_profile boolean,
    space_nickname text, space_avatar_path text, joined_at timestamptz
  )
  language sql stable security definer set search_path = ''
as $$
  select
    m.user_id,
    case when m.user_id = (select auth.uid ()) or m.show_profile then coalesce(m.nickname, p.nickname) end,
    case when m.user_id = (select auth.uid ()) or m.show_profile then coalesce(m.avatar_path, p.avatar_path) end,
    m.user_id = (select auth.uid ()),
    m.user_id = public.space_owner (target_space),
    m.show_profile,
    case when m.user_id = (select auth.uid ()) then m.nickname end,
    case when m.user_id = (select auth.uid ()) then m.avatar_path end,
    m.joined_at
  from public.space_members m
  left join public.profiles p on p.user_id = m.user_id
  where m.space_id = target_space
    and target_space in (select public.my_space_ids ())
  order by m.joined_at;
$$;
revoke execute on function public.space_member_profiles (uuid) from public, anon;
grant execute on function public.space_member_profiles (uuid) to authenticated;
