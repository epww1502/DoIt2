-- 커플 방
create table public.couples (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null unique,
  started_on date,
  created_at timestamptz not null default now()
);

-- 누가 어느 커플인지 (한 사람은 한 커플에만)
create table public.couple_members (
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id),
  unique (user_id)
);
create index couple_members_couple_id_idx on public.couple_members (couple_id);

-- 버킷리스트 항목. done(함께한 기록)은 앱 모델과 같은 모양의 jsonb
create table public.bucket_items (
  id uuid primary key,
  couple_id uuid not null references public.couples (id) on delete cascade,
  kind text not null check (kind in ('place', 'activity')),
  title text not null check (char_length(title) between 1 and 40),
  category text not null,
  setting text not null check (setting in ('indoor', 'outdoor')),
  location text not null default '',
  place jsonb,
  memo text not null default '',
  done jsonb,
  created_by uuid default auth.uid () references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bucket_items_couple_id_idx on public.bucket_items (couple_id);
create index bucket_items_created_by_idx on public.bucket_items (created_by);

-- updated_at 자동 갱신
create function public.touch_updated_at () returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger bucket_items_touch_updated_at
before update on public.bucket_items
for each row execute function public.touch_updated_at ();

-- 지금 로그인한 사람의 커플 id (RLS에서 쓴다. 정책끼리 서로 부르며 꼬이지 않게 security definer)
create function public.my_couple_id () returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select couple_id from public.couple_members where user_id = (select auth.uid ());
$$;

revoke execute on function public.my_couple_id () from public, anon;
grant execute on function public.my_couple_id () to authenticated;

-- RLS: 내가 속한 커플의 데이터만
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.bucket_items enable row level security;

create policy "members read their couple" on public.couples
for select to authenticated
using (id = (select public.my_couple_id ()));

create policy "members update their couple" on public.couples
for update to authenticated
using (id = (select public.my_couple_id ()))
with check (id = (select public.my_couple_id ()));

create policy "members read their couple members" on public.couple_members
for select to authenticated
using (couple_id = (select public.my_couple_id ()));

create policy "members read items" on public.bucket_items
for select to authenticated
using (couple_id = (select public.my_couple_id ()));

create policy "members add items" on public.bucket_items
for insert to authenticated
with check (couple_id = (select public.my_couple_id ()));

create policy "members update items" on public.bucket_items
for update to authenticated
using (couple_id = (select public.my_couple_id ()))
with check (couple_id = (select public.my_couple_id ()));

create policy "members delete items" on public.bucket_items
for delete to authenticated
using (couple_id = (select public.my_couple_id ()));
