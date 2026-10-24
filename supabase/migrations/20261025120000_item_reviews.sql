-- 사람마다 따로 남기는 별점·한 줄 소감.
-- 날짜·사진은 지금처럼 bucket_items.done(공동 기록)에 두고, 별점·소감만 여기에 사람별로 둔다.
-- rating이 null이면 그 사람은 평가를 건너뛰었다 (함께한 것으로는 넘어가지만 평가는 없다).
create table public.item_reviews (
  item_id uuid not null references public.bucket_items (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- 실시간 필터·권한 확인용 (항목의 공간을 트리거가 채운다)
  space_id uuid not null references public.spaces (id) on delete cascade,
  rating smallint check (rating between 1 and 5),
  review text not null default '' check (char_length(review) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (item_id, user_id)
);

create index item_reviews_space_id_idx on public.item_reviews (space_id);
create index item_reviews_user_id_idx on public.item_reviews (user_id);

-- space_id는 항목에서 가져온다 (다른 공간 id를 넣어 권한을 피하지 못하게)
create function public.item_reviews_fill_space () returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select space_id into new.space_id from public.bucket_items where id = new.item_id;
  if new.space_id is null then
    raise exception 'item_not_found';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- 트리거로만 쓴다 (API로 부르지 못하게)
revoke execute on function public.item_reviews_fill_space () from public, anon, authenticated;

create trigger item_reviews_fill_space
before insert or update on public.item_reviews
for each row execute function public.item_reviews_fill_space ();

alter table public.item_reviews enable row level security;

create policy "members read reviews" on public.item_reviews
for select to authenticated
using (space_id in (select public.my_space_ids ()));

create policy "members write own review" on public.item_reviews
for insert to authenticated
with check (
  user_id = (select auth.uid ())
  and space_id in (select public.my_space_ids ())
);

create policy "members update own review" on public.item_reviews
for update to authenticated
using (user_id = (select auth.uid ()))
with check (
  user_id = (select auth.uid ())
  and space_id in (select public.my_space_ids ())
);

create policy "members delete own review" on public.item_reviews
for delete to authenticated
using (user_id = (select auth.uid ()));

-- 실시간: 지운 행도 item_id·user_id를 알 수 있게
alter table public.item_reviews replica identity full;
alter publication supabase_realtime add table public.item_reviews;

-- 지금까지의 기록(한 사람 것)은 그 항목을 담은 사람의 평가로 옮겨 둔다
insert into public.item_reviews (item_id, user_id, space_id, rating, review)
select
  id,
  created_by,
  space_id,
  least(greatest(coalesce((done ->> 'rating')::int, 5), 1), 5),
  coalesce(done ->> 'review', '')
from public.bucket_items
where done is not null and created_by is not null
on conflict do nothing;
