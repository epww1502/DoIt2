-- 같이 갈 날 맞추기: 함께 쓰는 공간에서 사람마다 '이 날 돼요'를 고른다 (하루에 한 표).
-- 다 같이 되는 날을 골라 목표 날짜로 정하면, 그 항목의 표는 누구든 비울 수 있다.

create table public.item_date_votes (
  item_id uuid not null references public.bucket_items (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  space_id uuid not null references public.spaces (id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  primary key (item_id, user_id, day)
);

create index item_date_votes_space_id_idx on public.item_date_votes (space_id);
create index item_date_votes_user_id_idx on public.item_date_votes (user_id);

-- 공간은 항목에서 채운다 (다른 공간 id로 권한을 피하지 못하게)
create trigger item_date_votes_fill_space
before insert on public.item_date_votes
for each row execute function public.fill_item_space ();

alter table public.item_date_votes enable row level security;

create policy "members read date votes" on public.item_date_votes
for select to authenticated
using (space_id in (select public.my_space_ids ()));

create policy "members add own date vote" on public.item_date_votes
for insert to authenticated
with check (
  user_id = (select auth.uid ())
  and space_id in (select public.my_space_ids ())
);

-- 내 표 빼기, 그리고 날을 정했을 때 그 항목 표 비우기 (같은 공간 사람 누구나)
create policy "members remove date votes" on public.item_date_votes
for delete to authenticated
using (space_id in (select public.my_space_ids ()));

-- 실시간 (지운 행도 어느 항목·날 것인지 알 수 있게)
alter table public.item_date_votes replica identity full;
alter publication supabase_realtime add table public.item_date_votes;

-- 알림함 detail에 'dates' (같이 갈 날)
alter table public.notifications drop constraint notifications_detail_check;
alter table public.notifications add constraint notifications_detail_check
check (detail in ('photos', 'liked', 'wanted', 'dates'));

-- 휴지통: 날짜 표도 같이 보관하고 되살린다
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
        'item_wants', coalesce((select jsonb_agg(to_jsonb(x)) from public.item_wants x where x.item_id = v_item.id), '[]'),
        'item_date_votes', coalesce((select jsonb_agg(to_jsonb(x)) from public.item_date_votes x where x.item_id = v_item.id), '[]')
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

  -- 예전에 지운 항목은 이 칸이 없다 (null이면 아무것도 넣지 않는다)
  insert into public.item_date_votes
  select x.* from jsonb_populate_recordset(null::public.item_date_votes, coalesce(v_snap -> 'item_date_votes', '[]')) x
  where x.user_id in (select id from auth.users);

  delete from public.trashed_items where id = p_id;
end;
$$;
