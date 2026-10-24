-- 공간별 프로필: 공간마다 공개 여부, 그 공간에서만 쓸 닉네임·사진을 따로 둔다.
-- 공간 닉네임·사진이 비어 있으면 기본 프로필(profiles)을 보여준다.
alter table public.space_members
  add column show_profile boolean not null default true,
  add column nickname text check (nickname is null or char_length(nickname) between 1 and 20),
  add column avatar_path text;

-- 공개는 공간마다 정하므로 기본 프로필의 공개 여부는 뺀다
alter table public.profiles drop column is_public;
-- 프로필 사진은 내 폴더(avatars/{내 id}/...)에 있는 것만
alter table public.profiles add constraint profiles_avatar_path_own
  check (avatar_path is null or avatar_path like 'avatars/' || user_id::text || '/%');

-- 공간 멤버 목록. 그 공간에서 공개를 끈 사람은 닉네임·사진을 빼고 돌려준다 (나 자신은 그대로)
-- space_nickname·space_avatar_path는 내가 이 공간에만 따로 정한 값 (내 줄에서만 온다)
drop function public.space_member_profiles (uuid);
create function public.space_member_profiles (target_space uuid)
  returns table (
    user_id uuid, nickname text, avatar_path text, is_me boolean, show_profile boolean,
    space_nickname text, space_avatar_path text, joined_at timestamptz
  )
  language sql stable security definer set search_path = ''
as $$
  select
    m.user_id,
    case when m.user_id = (select auth.uid ()) or m.show_profile then coalesce(m.nickname, p.nickname) end,
    case when m.user_id = (select auth.uid ()) or m.show_profile then coalesce(m.avatar_path, p.avatar_path) end,
    m.user_id = (select auth.uid ()),
    m.show_profile,
    case when m.user_id = (select auth.uid ()) then m.nickname end,
    case when m.user_id = (select auth.uid ()) then m.avatar_path end,
    m.joined_at
  from public.space_members m
  left join public.profiles p on p.user_id = m.user_id
  where m.space_id = target_space
    and target_space in (select public.my_space_ids ())
  order by m.joined_at;
$$;
revoke execute on function public.space_member_profiles (uuid) from public, anon;
grant execute on function public.space_member_profiles (uuid) to authenticated;

-- 이 공간에서의 내 프로필 (내 줄만 바꾼다). 사진은 내 폴더에 있는 것만
create function public.set_space_profile (target_space uuid, visible boolean, space_nickname text, space_avatar_path text)
  returns void language plpgsql security definer set search_path = ''
as $$
begin
  if space_avatar_path is not null
     and space_avatar_path not like 'avatars/' || (select auth.uid ())::text || '/%' then
    raise exception 'invalid_avatar_path';
  end if;
  update public.space_members
  set show_profile = visible,
      nickname = nullif(btrim(space_nickname), ''),
      avatar_path = space_avatar_path
  where space_id = target_space and user_id = (select auth.uid ());
end;
$$;
revoke execute on function public.set_space_profile (uuid, boolean, text, text) from public, anon;
grant execute on function public.set_space_profile (uuid, boolean, text, text) to authenticated;
