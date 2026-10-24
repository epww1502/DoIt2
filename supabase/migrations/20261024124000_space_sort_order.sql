-- 공간 노출 순서: 사람마다 따로 (내 줄의 sort_order). 비어 있으면 들어온 순서
alter table public.space_members add column sort_order int;

-- 내 공간 순서를 한 번에 정한다 (배열 순서대로 1, 2, 3 …)
create function public.set_space_order (ordered uuid[])
  returns void language sql security definer set search_path = ''
as $$
  update public.space_members m
  set sort_order = o.pos
  from unnest(ordered) with ordinality as o (space_id, pos)
  where m.space_id = o.space_id and m.user_id = (select auth.uid ());
$$;
revoke execute on function public.set_space_order (uuid[]) from public, anon;
grant execute on function public.set_space_order (uuid[]) to authenticated;
