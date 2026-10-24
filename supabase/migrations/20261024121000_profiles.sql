-- 프로필: 닉네임(선택)·공개 여부·프로필 사진. 공간 멤버 목록에 보인다.
create table public.profiles (
  user_id uuid primary key default auth.uid () references auth.users (id) on delete cascade,
  nickname text check (nickname is null or char_length(nickname) between 1 and 20),
  -- 끄면 같은 공간 멤버에게도 '익명'으로 보인다
  is_public boolean not null default true,
  -- photos 버킷의 avatars/{user_id}/... 경로
  avatar_path text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 내 프로필만 직접 읽고 쓴다. 다른 사람 프로필은 space_member_profiles()로만 본다
create policy "own profile read" on public.profiles for select to authenticated
  using (user_id = (select auth.uid ()));
create policy "own profile insert" on public.profiles for insert to authenticated
  with check (user_id = (select auth.uid ()));
create policy "own profile update" on public.profiles for update to authenticated
  using (user_id = (select auth.uid ()))
  with check (user_id = (select auth.uid ()));

-- 나와 같은 공간에 있는 사람들 (나 포함)
create function public.my_space_mate_ids ()
  returns setof uuid
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select distinct m.user_id
  from public.space_members m
  where m.space_id in (select public.my_space_ids ());
$$;

-- 공간 멤버 목록. 공개를 끈 사람은 닉네임·사진을 빼고 돌려준다 (나 자신은 그대로)
create function public.space_member_profiles (target_space uuid)
  returns table (user_id uuid, nickname text, avatar_path text, is_me boolean, joined_at timestamptz)
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select
    m.user_id,
    case when m.user_id = (select auth.uid ()) or coalesce(p.is_public, true) then p.nickname end,
    case when m.user_id = (select auth.uid ()) or coalesce(p.is_public, true) then p.avatar_path end,
    m.user_id = (select auth.uid ()),
    m.joined_at
  from public.space_members m
  left join public.profiles p on p.user_id = m.user_id
  where m.space_id = target_space
    and target_space in (select public.my_space_ids ())
  order by m.joined_at;
$$;

revoke execute on function public.my_space_mate_ids () from public, anon;
revoke execute on function public.space_member_profiles (uuid) from public, anon;
grant execute on function public.space_member_profiles (uuid) to authenticated;
-- 아래 사진 읽기 정책에서 쓴다
grant execute on function public.my_space_mate_ids () to authenticated;

-- 프로필 사진: avatars/{내 user_id}/... 에 올리고, 같은 공간 사람만 볼 수 있다
create policy "own avatar upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername (name))[1] = 'avatars'
    and (storage.foldername (name))[2] = (select auth.uid ())::text
  );
create policy "own avatar update" on storage.objects for update to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername (name))[1] = 'avatars'
    and (storage.foldername (name))[2] = (select auth.uid ())::text
  );
create policy "own avatar delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername (name))[1] = 'avatars'
    and (storage.foldername (name))[2] = (select auth.uid ())::text
  );
create policy "space mates read avatars" on storage.objects for select to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername (name))[1] = 'avatars'
    and (
      (storage.foldername (name))[2] = (select auth.uid ())::text
      or (storage.foldername (name))[2] in (select id::text from public.my_space_mate_ids () id)
    )
  );
