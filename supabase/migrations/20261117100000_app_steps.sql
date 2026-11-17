-- 처음 쓰는 사람이 어디까지 가는지 세는 기록 (시작 화면 → 첫 항목 → 초대 → 뽑기 → 첫 기록).
-- 시작 과정을 바꾼 뒤 정말 쉬워졌는지 숫자로 보려는 것. 단계 이름만 남기고, 쓴 글·항목 이름은 남기지 않는다.
-- 앱은 넣기만 하고, 읽기는 대시보드·SQL(서비스 키)로만 한다.
create table public.app_steps (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid () references auth.users (id) on delete cascade,
  -- welcome_shown, who_chosen, items_added, invite_sent, joined_shown, first_pick, first_record … (lib/steps.ts)
  step text not null check (step ~ '^[a-z_]{1,40}$'),
  -- 단계에 딸린 짧은 값 (예: who_chosen의 couple, items_added의 "3+1")
  detail text check (char_length(detail) <= 40),
  platform text check (char_length(platform) <= 20),
  app_version text check (char_length(app_version) <= 20)
);

create index app_steps_created_at_idx on public.app_steps (created_at);

alter table public.app_steps enable row level security;

create policy "users insert own steps" on public.app_steps for insert
  to authenticated
  with check (user_id = (select auth.uid ()));

grant insert on public.app_steps to authenticated;

-- 하루·단계별로 모아 보기 (한국 날짜). users: 그 단계를 거친 사람 수
create view public.app_steps_daily
with (security_invoker = true) as
select
  (created_at at time zone 'Asia/Seoul')::date as day,
  step,
  count(distinct user_id) as users,
  count(*) as events
from public.app_steps
group by 1, 2
order by 1 desc, 2;

revoke all on public.app_steps_daily from anon, authenticated;

comment on table public.app_steps is '처음 쓰는 사람이 거친 단계 (단계 이름만, 내용 없음)';
comment on view public.app_steps_daily is '하루·단계별 사람 수 (한국 날짜)';
