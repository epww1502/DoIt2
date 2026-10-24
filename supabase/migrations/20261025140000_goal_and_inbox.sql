-- 1) 목표 날짜: { "date": "YYYY-MM-DD", "remind": ["week" | "day" | "morning"] } (선택)
alter table public.bucket_items add column goal jsonb;

-- 2) 알림함: 같은 공간 사람의 소식(담기·기록·평가)을 사람마다 한 줄씩 남긴다.
--    푸시를 꺼둔 사람도 앱 안 알림센터에서 볼 수 있게. notify Edge Function이 서비스 키로 넣는다.
create table public.notifications (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  space_id uuid references public.spaces (id) on delete cascade,
  item_id uuid references public.bucket_items (id) on delete set null,
  kind text not null check (kind in ('added', 'done', 'reviewed')),
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index notifications_space_id_idx on public.notifications (space_id);
create index notifications_item_id_idx on public.notifications (item_id);

alter table public.notifications enable row level security;

-- 내 알림만 읽고, 읽음 표시만 바꿀 수 있다 (넣기는 서버 함수만)
create policy "own notifications read" on public.notifications
for select to authenticated
using (user_id = (select auth.uid ()));

create policy "own notifications mark read" on public.notifications
for update to authenticated
using (user_id = (select auth.uid ()))
with check (user_id = (select auth.uid ()));

create policy "own notifications delete" on public.notifications
for delete to authenticated
using (user_id = (select auth.uid ()));

revoke insert, update on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

alter publication supabase_realtime add table public.notifications;
