-- 사람마다 마지막으로 앱을 쓴 때를 대시보드(Table Editor)에서 보기 위한 보기.
-- 익명 계정은 처음 한 번만 로그인해서 auth.users.last_sign_in_at이 가입 시각에 멈춰 있다.
-- 앱을 쓰는 동안에는 로그인 세션이 한 시간쯤마다 갱신되므로 그 시각을 '마지막 사용'으로 본다
-- (그래서 한 시간쯤의 오차가 있다). 세션이 없으면 마지막 로그인 시각을 쓴다.
-- security_invoker라 auth 표를 못 읽는 앱 사용자(anon, authenticated)는 볼 수 없다.
create view public.user_activity
with (security_invoker = true) as
select
  u.id as user_id,
  p.nickname,
  (u.created_at at time zone 'Asia/Seoul')::timestamp(0) as joined_kst,
  (
    coalesce(
      max(greatest(s.created_at, s.updated_at, s.refreshed_at at time zone 'utc')),
      u.last_sign_in_at
    ) at time zone 'Asia/Seoul'
  )::timestamp(0) as last_used_kst
from auth.users u
left join auth.sessions s on s.user_id = u.id
left join public.profiles p on p.user_id = u.id
group by u.id, p.nickname
order by last_used_kst desc nulls last;

revoke all on public.user_activity from anon, authenticated;

comment on view public.user_activity is '사람마다 마지막으로 앱을 쓴 때 (한국 시간, 세션 갱신 기준)';
