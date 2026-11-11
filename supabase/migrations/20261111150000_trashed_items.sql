-- 휴지통: 공간 항목을 지우면 48시간 동안 되살릴 수 있게 통째로 보관한다.
-- 항목 행은 그대로 지워서(예전 앱·실시간 지우기 이벤트가 그대로 동작) 같이 지워지는 평가·댓글·반응·하트·
-- '하고 싶어요'를 snapshot에 담아 두었다가 되살릴 때 다시 넣는다.
-- 48시간이 지난 것은 앱이 사진을 정리한 뒤 행을 지운다 (사진 파일은 그때까지 남겨 둔다).

create table public.trashed_items (
  id uuid primary key,
  space_id uuid not null references public.spaces (id) on delete cascade,
  title text not null,
  deleted_by uuid references auth.users (id) on delete set null,
  deleted_at timestamptz not null default now(),
  -- { item, reviews, comments, item_reactions, comment_reactions, photo_likes, item_wants }
  snapshot jsonb not null
);

create index trashed_items_space_id_idx on public.trashed_items (space_id, deleted_at desc);
create index trashed_items_deleted_by_idx on public.trashed_items (deleted_by);

alter table public.trashed_items enable row level security;

create policy "members read trash" on public.trashed_items
for select to authenticated
using (space_id in (select public.my_space_ids ()));

-- 바로 비우기·48시간 지난 것 정리 (넣기·되살리기는 아래 함수로만)
create policy "members empty trash" on public.trashed_items
for delete to authenticated
using (space_id in (select public.my_space_ids ()));

-- 항목들을 휴지통으로 옮긴다 (내 공간 항목만). 옮긴 수를 돌려준다
create or replace function public.trash_items (p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
  v_item public.bucket_items;
begin
  for v_item in
    select * from public.bucket_items
    where id = any (p_ids)
      and space_id in (select public.my_space_ids ())
    for update
  loop
    insert into public.trashed_items (id, space_id, title, deleted_by, snapshot)
    values (
      v_item.id,
      v_item.space_id,
      v_item.title,
      auth.uid (),
      jsonb_build_object(
        'item', to_jsonb(v_item),
        'reviews', coalesce((select jsonb_agg(to_jsonb(r)) from public.item_reviews r where r.item_id = v_item.id), '[]'),
        'comments', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at) from public.item_comments c where c.item_id = v_item.id), '[]'),
        'item_reactions', coalesce((select jsonb_agg(to_jsonb(x)) from public.item_reactions x where x.item_id = v_item.id), '[]'),
        'comment_reactions', coalesce((select jsonb_agg(to_jsonb(x)) from public.comment_reactions x where x.item_id = v_item.id), '[]'),
        'photo_likes', coalesce((select jsonb_agg(to_jsonb(x)) from public.photo_likes x where x.item_id = v_item.id), '[]'),
        'item_wants', coalesce((select jsonb_agg(to_jsonb(x)) from public.item_wants x where x.item_id = v_item.id), '[]')
      )
    )
    on conflict (id) do update
      set snapshot = excluded.snapshot,
          title = excluded.title,
          deleted_by = excluded.deleted_by,
          deleted_at = now();
    delete from public.bucket_items where id = v_item.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- 휴지통에서 되살린다 (48시간 안, 내 공간 것만). 그 사이 계정을 지운 사람의 평가·댓글은 빠진다
create or replace function public.restore_trashed_item (p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trash public.trashed_items;
  v_snap jsonb;
  v_item jsonb;
begin
  select * into v_trash from public.trashed_items
  where id = p_id
    and space_id in (select public.my_space_ids ())
  for update;
  if not found then
    raise exception 'trash_not_found' using errcode = 'P0002';
  end if;
  if v_trash.deleted_at < now() - interval '48 hours' then
    raise exception 'trash_expired' using errcode = 'P0001';
  end if;
  v_snap := v_trash.snapshot;
  v_item := v_snap -> 'item';
  -- 담은 사람이 계정을 지웠으면 비워 둔다
  if not exists (
    select 1 from auth.users where id = (v_item ->> 'created_by')::uuid
  ) then
    v_item := jsonb_set(v_item, '{created_by}', 'null');
  end if;

  insert into public.bucket_items
  select * from jsonb_populate_record(null::public.bucket_items, v_item);

  insert into public.item_reviews
  select r.* from jsonb_populate_recordset(null::public.item_reviews, v_snap -> 'reviews') r
  where r.user_id in (select id from auth.users);

  insert into public.item_comments
  select c.* from jsonb_populate_recordset(null::public.item_comments, v_snap -> 'comments') c
  where c.user_id in (select id from auth.users);

  insert into public.item_reactions
  select x.* from jsonb_populate_recordset(null::public.item_reactions, v_snap -> 'item_reactions') x
  where x.user_id in (select id from auth.users);

  insert into public.comment_reactions
  select x.* from jsonb_populate_recordset(null::public.comment_reactions, v_snap -> 'comment_reactions') x
  where x.user_id in (select id from auth.users)
    and x.comment_id in (select id from public.item_comments where item_id = p_id);

  insert into public.photo_likes
  select x.* from jsonb_populate_recordset(null::public.photo_likes, v_snap -> 'photo_likes') x
  where x.user_id in (select id from auth.users);

  insert into public.item_wants
  select x.* from jsonb_populate_recordset(null::public.item_wants, v_snap -> 'item_wants') x
  where x.user_id in (select id from auth.users);

  delete from public.trashed_items where id = p_id;
end;
$$;

revoke execute on function public.trash_items (uuid[]) from public, anon;
revoke execute on function public.restore_trashed_item (uuid) from public, anon;
grant execute on function public.trash_items (uuid[]) to authenticated;
grant execute on function public.restore_trashed_item (uuid) to authenticated;
