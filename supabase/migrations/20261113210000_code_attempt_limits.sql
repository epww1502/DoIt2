-- 초대 코드·공유 코드를 마구 넣어 보며 맞히는 것을 막는다: 한 사람이 1시간에 10번 틀리면 그 뒤로는 받지 않는다.
-- (코드가 6~8자리라 횟수 제한이 없으면 반복해서 넣어 남의 공간·공유 목록에 닿을 수 있다)
-- 틀린 기록. 함수(security definer)만 쓰고 앱은 직접 못 본다.
create table public.code_attempts (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('invite', 'share')),
  at timestamptz not null default now()
);
create index code_attempts_user_at_idx on public.code_attempts (user_id, at);
alter table public.code_attempts enable row level security;

-- 들어가기. 달라진 점:
-- 1) 최근 1시간에 10번 틀렸으면 too_many_attempts
-- 2) 코드가 틀리면 오류를 던지지 않고 400 + { message: 'invalid_code' }를 돌려준다.
--    오류를 던지면 방금 적은 '틀린 기록'까지 되돌려져서 횟수를 셀 수 없다.
--    앱이 받는 모양은 전과 같다 (error.message에 invalid_code).
-- 그래서 돌려주는 타입이 spaces 행에서 jsonb로 바뀐다 (성공하면 같은 모양의 공간 한 줄).
drop function public.join_space (text);
create function public.join_space (code text)
  returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid ();
  target public.spaces;
  member_count int;
  recent int;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select count(*) into recent from public.code_attempts a
  where a.user_id = uid and a.kind = 'invite' and a.at > now() - interval '1 hour';
  if recent >= 10 then
    raise exception 'too_many_attempts' using errcode = 'P0001';
  end if;

  select * into target from public.spaces
  where invite_code = upper(trim(code))
  for update;
  if not found then
    insert into public.code_attempts (user_id, kind) values (uid, 'invite');
    -- 하루 지난 기록은 이참에 치운다
    delete from public.code_attempts a where a.at < now() - interval '1 day';
    perform set_config('response.status', '400', true);
    return jsonb_build_object('message', 'invalid_code', 'code', 'P0001');
  end if;

  if exists (select 1 from public.space_members where space_id = target.id and user_id = uid) then
    return to_jsonb(target);
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
  return to_jsonb(target);
end;
$$;
revoke execute on function public.join_space (text) from public, anon;
grant execute on function public.join_space (text) to authenticated;

-- 코드로 공유받기. 없는 코드는 전처럼 빈 결과를 주되 틀린 횟수를 세고, 1시간에 10번 틀리면 too_many_attempts
create or replace function public.get_shared_list (share_code text)
  returns table (title text, items jsonb, sender text, created_at timestamptz)
  language plpgsql volatile security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid ();
  recent int;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select count(*) into recent from public.code_attempts a
  where a.user_id = uid and a.kind = 'share' and a.at > now() - interval '1 hour';
  if recent >= 10 then
    raise exception 'too_many_attempts' using errcode = 'P0001';
  end if;

  return query
    select s.title, s.items, p.nickname, s.created_at
    from public.shared_lists s
    left join public.profiles p on p.user_id = s.created_by
    where s.code = upper(btrim(share_code))
      and s.expires_at > now();
  if not found then
    insert into public.code_attempts (user_id, kind) values (uid, 'share');
  end if;
end;
$$;
revoke execute on function public.get_shared_list (text) from public, anon;
grant execute on function public.get_shared_list (text) to authenticated;

-- AI 전체 하루 사용량 (모든 사람 합계). ai 함수가 전체 상한을 볼 때 쓴다:
-- 한 사람 한도는 계정을 새로 만들면 피할 수 있어서, 전체가 쓸 수 있는 양에도 상한을 둔다.
create function public.ai_used_today ()
  returns int language sql stable security definer set search_path = ''
as $$
  select coalesce(sum(count), 0)::int from public.ai_usage
  where day = (now() at time zone 'Asia/Seoul')::date;
$$;
revoke execute on function public.ai_used_today () from public, anon, authenticated;
grant execute on function public.ai_used_today () to service_role;
