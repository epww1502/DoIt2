-- 개인 공간: 나만 쓰는 공간 (서버에 저장되지만 초대할 수 없다)
alter table public.spaces add column is_personal boolean not null default false;

-- 앱이 직접 바꾸지 못하게 지킨다 (set_space_personal로만)
create or replace function public.protect_space_columns ()
  returns trigger language plpgsql set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.invite_code := old.invite_code;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.owner_id := old.owner_id;
    new.is_personal := old.is_personal;
  end if;
  return new;
end;
$$;

-- 만들기: personal을 켜면 개인 공간 (예전 앱은 두 값만 보내도 된다)
drop function public.create_space (text, text);
create function public.create_space (space_name text, space_emoji text, personal boolean default false)
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

  insert into public.spaces (name, emoji, invite_code, created_by, owner_id, is_personal)
  values (
    coalesce(nullif(trim(space_name), ''), case when personal then '나의 공간' else '우리 공간' end),
    coalesce(nullif(trim(space_emoji), ''), '💞'),
    public.generate_invite_code (),
    uid,
    uid,
    coalesce(personal, false)
  )
  returning * into result;

  insert into public.space_members (space_id, user_id) values (result.id, uid);
  return result;
end;
$$;
revoke execute on function public.create_space (text, text, boolean) from public, anon;
grant execute on function public.create_space (text, text, boolean) to authenticated;

-- 들어가기: 개인 공간에는 들어갈 수 없다
create or replace function public.join_space (code text)
  returns public.spaces language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid ();
  target public.spaces;
  member_count int;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into target from public.spaces
  where invite_code = upper(trim(code))
  for update;
  if not found then
    raise exception 'invalid_code' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.space_members where space_id = target.id and user_id = uid) then
    return target;
  end if;

  if target.is_personal then
    raise exception 'personal_space' using errcode = 'P0001';
  end if;

  if (select count(*) from public.space_members where user_id = uid) >= 20 then
    raise exception 'too_many_spaces' using errcode = 'P0001';
  end if;

  select count(*) into member_count from public.space_members where space_id = target.id;
  if member_count >= 10 then
    raise exception 'space_full' using errcode = 'P0001';
  end if;

  insert into public.space_members (space_id, user_id) values (target.id, uid);
  return target;
end;
$$;

-- 개인 ↔ 함께 쓰기 바꾸기 (공간장만). 다른 멤버가 있으면 개인으로 바꿀 수 없다
create function public.set_space_personal (target_space uuid, personal boolean)
  returns void language plpgsql security definer set search_path = ''
as $$
begin
  if public.space_owner (target_space) is distinct from auth.uid () then
    raise exception 'not_owner' using errcode = 'P0001';
  end if;
  if personal and (select count(*) from public.space_members where space_id = target_space) > 1 then
    raise exception 'has_members' using errcode = 'P0001';
  end if;
  update public.spaces set is_personal = personal where id = target_space;
end;
$$;
revoke execute on function public.set_space_personal (uuid, boolean) from public, anon;
grant execute on function public.set_space_personal (uuid, boolean) to authenticated;
