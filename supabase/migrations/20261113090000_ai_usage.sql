-- AI 기능 하루 사용 횟수. ai 함수(Edge Function)만 읽고 쓴다 (앱은 직접 못 본다).
-- kind: ai(추천·쪼개기·여러 개 담기처럼 눌러서 쓰는 것) auto(담을 때 저절로 되는 분류)
create table public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('ai', 'auto')),
  count int not null default 0,
  primary key (user_id, day, kind)
);

-- 정책을 두지 않아서 서비스 키로만 접근된다
alter table public.ai_usage enable row level security;

-- 오늘(한국 날짜) 횟수를 하나 올린다. 이미 한도를 채웠으면 올리지 않고 false.
-- 한 문장으로 올려서 동시에 여러 번 불러도 한도를 넘지 않는다.
create function public.use_ai(p_user uuid, p_kind text, p_limit int)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with bumped as (
    insert into public.ai_usage as u (user_id, day, kind, count)
    values (p_user, (now() at time zone 'Asia/Seoul')::date, p_kind, 1)
    on conflict (user_id, day, kind)
      do update set count = u.count + 1 where u.count < p_limit
    returning 1
  )
  select exists (select 1 from bumped);
$$;

revoke execute on function public.use_ai(uuid, text, int) from public, anon, authenticated;
grant execute on function public.use_ai(uuid, text, int) to service_role;
