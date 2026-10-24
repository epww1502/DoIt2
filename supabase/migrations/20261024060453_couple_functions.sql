-- 헷갈리는 글자(0/O, 1/I/L)를 뺀 6자리 초대 코드
create function public.generate_invite_code () returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.couples where invite_code = code);
  end loop;
  return code;
end;
$$;

revoke execute on function public.generate_invite_code () from public, anon, authenticated;

-- 커플 방 만들기. 이미 커플이면 그 방을 돌려준다
create function public.create_couple ()
returns public.couples
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid ();
  result public.couples;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select c.* into result
  from public.couples c
  join public.couple_members m on m.couple_id = c.id
  where m.user_id = uid;
  if found then
    return result;
  end if;

  insert into public.couples (invite_code)
  values (public.generate_invite_code ())
  returning * into result;

  insert into public.couple_members (couple_id, user_id) values (result.id, uid);
  return result;
end;
$$;

-- 초대 코드로 커플 방 들어가기 (한 방에 최대 2명)
create function public.join_couple (code text)
returns public.couples
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid ();
  target public.couples;
  current_couple uuid;
  member_count int;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into target from public.couples
  where invite_code = upper(trim(code))
  for update;
  if not found then
    raise exception 'invalid_code' using errcode = 'P0001';
  end if;

  select couple_id into current_couple from public.couple_members where user_id = uid;
  if current_couple = target.id then
    return target;
  end if;
  if current_couple is not null then
    raise exception 'already_in_couple' using errcode = 'P0001';
  end if;

  select count(*) into member_count from public.couple_members where couple_id = target.id;
  if member_count >= 2 then
    raise exception 'couple_full' using errcode = 'P0001';
  end if;

  insert into public.couple_members (couple_id, user_id) values (target.id, uid);
  return target;
end;
$$;

-- 커플 연결 끊기. 마지막 사람이 나가면 방과 항목을 지운다
create function public.leave_couple ()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid ();
  current_couple uuid;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  delete from public.couple_members where user_id = uid
  returning couple_id into current_couple;

  if current_couple is not null
     and not exists (select 1 from public.couple_members where couple_id = current_couple) then
    delete from public.couples where id = current_couple;
  end if;
end;
$$;

revoke execute on function public.create_couple () from public, anon;
revoke execute on function public.join_couple (text) from public, anon;
revoke execute on function public.leave_couple () from public, anon;
grant execute on function public.create_couple () to authenticated;
grant execute on function public.join_couple (text) to authenticated;
grant execute on function public.leave_couple () to authenticated;
