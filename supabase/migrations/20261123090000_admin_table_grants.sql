-- app_admins 표에 남아 있던 기본 권한(anon·authenticated의 읽기·쓰기)을 뺀다.
-- 지금도 RLS 정책이 없어서 아무도 못 읽고 못 쓰지만, 나중에 정책을 잘못 더하면 PIN 해시가 드러날 수 있다.
-- 이 표는 security definer 함수(is_app_admin, admin_status, admin_unlock, admin_set_pin, admin_lock)와
-- 서버 함수(service_role)만 쓴다.
revoke all on public.app_admins from anon, authenticated;
