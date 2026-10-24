-- 커플(2명, 한 사람당 하나) → 공간(최대 10명, 한 사람이 여러 공간). 서버에 데이터가 없을 때 바꾼다.

-- 예전 사진 정책·실시간·함수·테이블 정리
drop policy if exists "members read couple photos" on storage.objects;
drop policy if exists "members upload couple photos" on storage.objects;
drop policy if exists "members update couple photos" on storage.objects;
drop policy if exists "members delete couple photos" on storage.objects;

alter publication supabase_realtime drop table public.bucket_items;
alter publication supabase_realtime drop table public.couple_members;

drop function public.create_couple ();
drop function public.join_couple (text);
drop function public.leave_couple ();
drop table public.bucket_items;
drop table public.couple_members;
drop table public.couples;
drop function public.my_couple_id ();

-- 공간
create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default '우리 공간' check (char_length(name) between 1 and 20),
  emoji text not null default '💞' check (char_length(emoji) between 1 and 8),
  invite_code text not null unique,
  created_by uuid default auth.uid () references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index spaces_created_by_idx on public.spaces (created_by);

-- 누가 어느 공간에 있는지 (한 사람이 여러 공간에 들어갈 수 있다)
create table public.space_members (
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id)
);
create index space_members_user_id_idx on public.space_members (user_id);

-- 버킷리스트 항목. done(함께한 기록)은 앱 모델과 같은 모양의 jsonb
create table public.bucket_items (
  id uuid primary key,
  space_id uuid not null references public.spaces (id) on delete cascade,
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
create index bucket_items_space_id_idx on public.bucket_items (space_id);
create index bucket_items_created_by_idx on public.bucket_items (created_by);

create trigger bucket_items_touch_updated_at
before update on public.bucket_items
for each row execute function public.touch_updated_at ();

-- 지금 로그인한 사람이 들어가 있는 공간들 (RLS에서 쓴다)
create function public.my_space_ids () returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select space_id from public.space_members where user_id = (select auth.uid ());
$$;

revoke execute on function public.my_space_ids () from public, anon;
grant execute on function public.my_space_ids () to authenticated;

-- RLS: 내가 들어가 있는 공간의 데이터만
alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.bucket_items enable row level security;

create policy "members read spaces" on public.spaces
for select to authenticated
using (id in (select public.my_space_ids ()));

-- 이름·이모지는 멤버 누구나 바꿀 수 있다 (초대 코드는 아래 트리거로 막는다)
create policy "members update spaces" on public.spaces
for update to authenticated
using (id in (select public.my_space_ids ()))
with check (id in (select public.my_space_ids ()));

create policy "members read space members" on public.space_members
for select to authenticated
using (space_id in (select public.my_space_ids ()));

create policy "members read items" on public.bucket_items
for select to authenticated
using (space_id in (select public.my_space_ids ()));

create policy "members add items" on public.bucket_items
for insert to authenticated
with check (space_id in (select public.my_space_ids ()));

create policy "members update items" on public.bucket_items
for update to authenticated
using (space_id in (select public.my_space_ids ()))
with check (space_id in (select public.my_space_ids ()));

create policy "members delete items" on public.bucket_items
for delete to authenticated
using (space_id in (select public.my_space_ids ()));

-- 초대 코드·만든 사람은 앱에서 바꿀 수 없다
create function public.protect_space_columns () returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.invite_code := old.invite_code;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger spaces_protect_columns
before update on public.spaces
for each row execute function public.protect_space_columns ();

-- generate_invite_code가 spaces 테이블을 보게 바꾼다
create or replace function public.generate_invite_code () returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.spaces where invite_code = code);
  end loop;
  return code;
end;
$$;

revoke execute on function public.generate_invite_code () from public, anon, authenticated;

-- 공간 만들기 (한 사람 최대 20개)
create function public.create_space (space_name text, space_emoji text)
returns public.spaces
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid ();
  result public.spaces;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if (select count(*) from public.space_members where user_id = uid) >= 20 then
    raise exception 'too_many_spaces' using errcode = 'P0001';
  end if;

  insert into public.spaces (name, emoji, invite_code, created_by)
  values (
    coalesce(nullif(trim(space_name), ''), '우리 공간'),
    coalesce(nullif(trim(space_emoji), ''), '💞'),
    public.generate_invite_code (),
    uid
  )
  returning * into result;

  insert into public.space_members (space_id, user_id) values (result.id, uid);
  return result;
end;
$$;

-- 초대 코드로 공간 들어가기 (한 공간 최대 10명)
create function public.join_space (code text)
returns public.spaces
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid ();
  target public.spaces;
  member_count int;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into target from public.spaces
  where invite_code = upper(trim(code))
  for update;
  if not found then
    raise exception 'invalid_code' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.space_members where space_id = target.id and user_id = uid) then
    return target;
  end if;

  if (select count(*) from public.space_members where user_id = uid) >= 20 then
    raise exception 'too_many_spaces' using errcode = 'P0001';
  end if;

  select count(*) into member_count from public.space_members where space_id = target.id;
  if member_count >= 10 then
    raise exception 'space_full' using errcode = 'P0001';
  end if;

  insert into public.space_members (space_id, user_id) values (target.id, uid);
  return target;
end;
$$;

-- 공간에서 나가기. 마지막 사람이 나가면 공간과 항목을 지운다
create function public.leave_space (target_space uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid ();
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  delete from public.space_members where space_id = target_space and user_id = uid;

  if not exists (select 1 from public.space_members where space_id = target_space) then
    delete from public.spaces where id = target_space;
  end if;
end;
$$;

revoke execute on function public.create_space (text, text) from public, anon;
revoke execute on function public.join_space (text) from public, anon;
revoke execute on function public.leave_space (uuid) from public, anon;
grant execute on function public.create_space (text, text) to authenticated;
grant execute on function public.join_space (text) to authenticated;
grant execute on function public.leave_space (uuid) to authenticated;

-- 사진: 경로는 {space_id}/{파일 이름}
create policy "members read space photos" on storage.objects
for select to authenticated
using (
  bucket_id = 'photos'
  and (storage.foldername (name))[1] in (select id::text from public.my_space_ids () as id)
);

create policy "members upload space photos" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'photos'
  and (storage.foldername (name))[1] in (select id::text from public.my_space_ids () as id)
);

create policy "members update space photos" on storage.objects
for update to authenticated
using (
  bucket_id = 'photos'
  and (storage.foldername (name))[1] in (select id::text from public.my_space_ids () as id)
);

create policy "members delete space photos" on storage.objects
for delete to authenticated
using (
  bucket_id = 'photos'
  and (storage.foldername (name))[1] in (select id::text from public.my_space_ids () as id)
);

-- 실시간
alter publication supabase_realtime add table public.bucket_items;
alter publication supabase_realtime add table public.space_members;
