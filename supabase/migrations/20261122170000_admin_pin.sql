-- 관리자 모드 PIN 잠금.
-- 관리자 권한은 계정에 붙어 있어서, 폰을 잃어버리거나 계정 코드가 새면 그 사람도 관리자 모드를 볼 수 있었다.
-- 이제 관리자 모드를 열 때마다 PIN(숫자 6자리)을 서버가 확인하고, 맞으면 15분 동안만 열어 준다.
-- 다섯 번 틀리면 1시간 잠근다. PIN은 해시로만 저장한다 (pgcrypto bcrypt).
-- PIN을 잊었으면 SQL로 지운다: update public.app_admins set pin_hash = null where user_id = '<계정 id>';

alter table public.app_admins
  add column pin_hash text,
  add column pin_fails integer not null default 0,
  add column pin_locked_until timestamptz,
  add column unlocked_until timestamptz;

-- 관리자 자료를 봐도 되는지: 관리자이고, PIN으로 열어 둔 15분 안일 때만.
-- (문의 목록의 RLS 정책과 admin_dashboard가 이 함수를 쓴다. 이름은 그대로 두고 뜻만 좁혔다)
create or replace function public.is_app_admin ()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.app_admins
    where user_id = (select auth.uid ()) and unlocked_until > now()
  );
$$;

-- 앱이 관리자 모드 줄을 보여줄지, PIN을 물을지 정할 때 쓴다
create function public.admin_status ()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'admin', true,
        'pin_set', pin_hash is not null,
        'unlocked', coalesce(unlocked_until > now(), false),
        'locked_until', case when pin_locked_until > now() then pin_locked_until end
      )
      from public.app_admins where user_id = (select auth.uid ())
    ),
    jsonb_build_object('admin', false)
  );
$$;

-- PIN을 확인하고 맞으면 15분 동안 연다.
-- 틀린 횟수를 남겨야 해서 틀렸을 때 예외를 던지지 않고 결과로 알려준다 (예외는 횟수 기록까지 되돌린다)
create function public.admin_unlock (pin text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.app_admins%rowtype;
  fails integer;
begin
  select * into a from public.app_admins
  where user_id = (select auth.uid ()) for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_admin');
  end if;
  if a.pin_hash is null then
    return jsonb_build_object('ok', false, 'reason', 'no_pin');
  end if;
  if a.pin_locked_until > now() then
    return jsonb_build_object('ok', false, 'reason', 'locked', 'locked_until', a.pin_locked_until);
  end if;

  if a.pin_hash = extensions.crypt(coalesce(pin, ''), a.pin_hash) then
    update public.app_admins
    set pin_fails = 0, pin_locked_until = null, unlocked_until = now() + interval '15 minutes'
    where user_id = a.user_id;
    return jsonb_build_object('ok', true);
  end if;

  fails := a.pin_fails + 1;
  if fails >= 5 then
    update public.app_admins
    set pin_fails = 0, pin_locked_until = now() + interval '1 hour', unlocked_until = null
    where user_id = a.user_id;
    return jsonb_build_object('ok', false, 'reason', 'locked', 'locked_until', now() + interval '1 hour');
  end if;
  update public.app_admins set pin_fails = fails where user_id = a.user_id;
  return jsonb_build_object('ok', false, 'reason', 'wrong', 'left', 5 - fails);
end;
$$;

-- PIN을 정하거나 바꾼다. 이미 PIN이 있으면 지금 PIN(old_pin)이 맞아야 한다. 정하면 바로 15분 동안 연다
create function public.admin_set_pin (new_pin text, old_pin text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.app_admins%rowtype;
  checked jsonb;
begin
  select * into a from public.app_admins
  where user_id = (select auth.uid ()) for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_admin');
  end if;
  if new_pin is null or new_pin !~ '^[0-9]{6}$' then
    return jsonb_build_object('ok', false, 'reason', 'bad_pin');
  end if;
  if a.pin_hash is not null then
    checked := public.admin_unlock (old_pin);
    if not (checked ->> 'ok')::boolean then
      return checked;
    end if;
  end if;

  update public.app_admins
  set
    pin_hash = extensions.crypt(new_pin, extensions.gen_salt('bf', 10)),
    pin_fails = 0,
    pin_locked_until = null,
    unlocked_until = now() + interval '15 minutes'
  where user_id = a.user_id;
  return jsonb_build_object('ok', true);
end;
$$;

-- 바로 잠근다 (관리자 모드를 나갈 때)
create function public.admin_lock ()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.app_admins set unlocked_until = null
  where user_id = (select auth.uid ());
$$;

revoke execute on function public.admin_status () from public, anon;
revoke execute on function public.admin_unlock (text) from public, anon;
revoke execute on function public.admin_set_pin (text, text) from public, anon;
revoke execute on function public.admin_lock () from public, anon;
grant execute on function public.admin_status () to authenticated;
grant execute on function public.admin_unlock (text) to authenticated;
grant execute on function public.admin_set_pin (text, text) to authenticated;
grant execute on function public.admin_lock () to authenticated;
