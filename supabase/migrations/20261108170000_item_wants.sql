-- '하고 싶어요': 공간 멤버가 버킷리스트 항목에 누르는 표 (한 사람이 한 항목에 한 번)
-- 많이 받은 항목이 목록 위로 오고, 뽑기에서도 더 잘 뽑힌다

create table public.item_wants (
  item_id uuid not null references public.bucket_items (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  space_id uuid not null references public.spaces (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (item_id, user_id)
);

create index item_wants_space_id_idx on public.item_wants (space_id);
create index item_wants_user_id_idx on public.item_wants (user_id);

-- 공간은 항목에서 채운다 (다른 공간 id로 권한을 피하지 못하게)
create trigger item_wants_fill_space
before insert on public.item_wants
for each row execute function public.fill_item_space ();

alter table public.item_wants enable row level security;

create policy "members read wants" on public.item_wants
for select to authenticated
using (space_id in (select public.my_space_ids ()));

create policy "members add own want" on public.item_wants
for insert to authenticated
with check (
  user_id = (select auth.uid ())
  and space_id in (select public.my_space_ids ())
);

create policy "members remove own want" on public.item_wants
for delete to authenticated
using (user_id = (select auth.uid ()));

-- 실시간 (다른 사람이 누르면 바로 보이게. 지운 행도 어느 항목 것인지 알 수 있게)
alter table public.item_wants replica identity full;
alter publication supabase_realtime add table public.item_wants;
