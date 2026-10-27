-- 신고와 차단 (App Store 1.2: 사용자 콘텐츠에는 신고·차단이 있어야 한다)

-- 신고: 넣기만 하고 아무도 못 읽는다. 운영자가 대시보드에서 보고 24시간 안에 처리한다.
create table public.content_reports (
  id uuid primary key default gen_random_uuid (),
  reporter_id uuid references auth.users (id) on delete set null default auth.uid (),
  space_id uuid not null references public.spaces (id) on delete cascade,
  target_user_id uuid references auth.users (id) on delete set null,
  comment_id uuid references public.item_comments (id) on delete set null,
  -- 댓글이 지워져도 무슨 내용이었는지 남긴다
  comment_body text,
  reason text not null check (reason in ('spam', 'abuse', 'sexual', 'other')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index content_reports_space_id_idx on public.content_reports (space_id);
create index content_reports_reporter_id_idx on public.content_reports (reporter_id);
create index content_reports_target_user_id_idx on public.content_reports (target_user_id);
create index content_reports_comment_id_idx on public.content_reports (comment_id);

alter table public.content_reports enable row level security;

create policy "members report in own space" on public.content_reports
for insert to authenticated
with check (
  reporter_id = (select auth.uid ())
  and space_id in (select public.my_space_ids ())
);

-- 차단: 차단한 사람의 댓글이 나에게 안 보인다
create table public.user_blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade default auth.uid (),
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index user_blocks_blocked_id_idx on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

create policy "read own blocks" on public.user_blocks
for select to authenticated
using (blocker_id = (select auth.uid ()));

create policy "add own blocks" on public.user_blocks
for insert to authenticated
with check (blocker_id = (select auth.uid ()));

create policy "remove own blocks" on public.user_blocks
for delete to authenticated
using (blocker_id = (select auth.uid ()));

-- 댓글 읽기에서 내가 차단한 사람 것을 뺀다 (실시간도 이 정책을 따른다)
drop policy "members read comments" on public.item_comments;

create policy "members read comments" on public.item_comments
for select to authenticated
using (
  space_id in (select public.my_space_ids ())
  and user_id not in (
    select blocked_id from public.user_blocks where blocker_id = (select auth.uid ())
  )
);
