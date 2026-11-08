-- 기록 사진 하트 (한 사람이 한 사진에 한 번) + 알림함 세부 종류

-- 알림함 세부 종류. kind는 예전 앱도 아는 값으로 두고, 새 앱만 이 칸을 보고 아이콘을 고른다
-- (예전 앱은 모르는 kind가 오면 알림함을 못 그린다)
alter table public.notifications
  add column detail text check (detail in ('photos', 'liked'));

create table public.photo_likes (
  -- 저장소 경로 ({space_id}/{파일})
  photo_path text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id uuid not null references public.bucket_items (id) on delete cascade,
  space_id uuid not null references public.spaces (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (photo_path, user_id)
);

create index photo_likes_item_id_idx on public.photo_likes (item_id);
create index photo_likes_space_id_idx on public.photo_likes (space_id);
create index photo_likes_user_id_idx on public.photo_likes (user_id);

-- 공간은 항목에서 채운다 (다른 공간 id로 권한을 피하지 못하게)
create trigger photo_likes_fill_space
before insert on public.photo_likes
for each row execute function public.fill_item_space ();

alter table public.photo_likes enable row level security;

-- 읽기: 공간 멤버, 내가 차단한 사람 것은 뺀다
create policy "members read photo likes" on public.photo_likes
for select to authenticated
using (
  space_id in (select public.my_space_ids ())
  and user_id not in (
    select blocked_id from public.user_blocks where blocker_id = (select auth.uid ())
  )
);

create policy "members add own photo like" on public.photo_likes
for insert to authenticated
with check (
  user_id = (select auth.uid ())
  and space_id in (select public.my_space_ids ())
);

create policy "members remove own photo like" on public.photo_likes
for delete to authenticated
using (user_id = (select auth.uid ()));
