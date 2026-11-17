-- AI 기능을 부른 기록. ai 함수(Edge Function)만 쓴다 (앱은 못 본다).
-- ai_usage는 하루 횟수만 세서 "한도에 걸린 사람이 있는지", "실제로 토큰을 얼마나 썼는지"를 알 수 없었다.
-- 요청 내용(이름·말한 글)은 남기지 않는다. 누가, 어떤 기능을, 어떻게 끝났는지와 토큰 수만 남긴다.
create table public.ai_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- fill, split, classify, parse, suggest
  action text not null,
  -- ok(답을 줌) limit_user(한 사람 하루 한도) limit_global(전체 하루 한도) failed(모델 호출 실패·거절)
  outcome text not null check (outcome in ('ok', 'limit_user', 'limit_global', 'failed')),
  model text,
  input_tokens int,
  output_tokens int,
  -- 모델을 부르고 답을 다 받을 때까지 걸린 시간
  ms int
);

create index ai_events_created_at_idx on public.ai_events (created_at);

-- 정책을 두지 않아서 서비스 키로만 접근된다
alter table public.ai_events enable row level security;

-- 하루씩 모아 보기 (한국 날짜). 대시보드(Table Editor)에서 본다.
-- est_usd: Haiku 5.5 요금(100만 토큰당 입력 $0.10, 출력 $0.50)으로 어림한 값
create view public.ai_daily
with (security_invoker = true) as
select
  (created_at at time zone 'Asia/Seoul')::date as day,
  count(distinct user_id) as users,
  count(*) filter (where outcome = 'ok') as ok,
  count(*) filter (where outcome = 'failed') as failed,
  count(*) filter (where outcome = 'limit_user') as limit_user,
  count(distinct user_id) filter (where outcome = 'limit_user') as users_hit_limit,
  count(*) filter (where outcome = 'limit_global') as limit_global,
  count(*) filter (where action = 'suggest' and outcome = 'ok') as suggest_ok,
  coalesce(sum(input_tokens), 0) as input_tokens,
  coalesce(sum(output_tokens), 0) as output_tokens,
  round(
    (coalesce(sum(input_tokens), 0) * 0.10 + coalesce(sum(output_tokens), 0) * 0.50) / 1000000.0,
    4
  ) as est_usd
from public.ai_events
group by 1
order by 1 desc;

revoke all on public.ai_daily from anon, authenticated;

comment on table public.ai_events is 'AI 기능 호출 기록 (결과와 토큰 수. 요청 내용은 없음)';
comment on view public.ai_daily is 'AI 호출을 하루씩 모은 것 (한국 날짜, 한도에 걸린 수와 어림 비용)';
