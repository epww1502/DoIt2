-- 항목 댓글과 이모지 반응 (공간 멤버끼리)

-- 항목의 공간을 채우는 트리거 함수 (댓글·반응 공통. 다른 공간 id로 권한을 피하지 못하게)
create function public.fill_item_space () returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select space_id into new.space_id from public.bucket_items where id = new.item_id;
  if new.space_id is null then
    raise exception 'item_not_found';
  end if;
  return new;
end;
$$;

revoke execute on function public.fill_item_space () from public, anon, authenticated;

-- 댓글
create table public.item_comments (
  id uuid primary key default gen_random_uuid (),
  item_id uuid not null references public.bucket_items (id) on delete cascade,
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 300),
  created_at timestamptz not null default now()
);

create index item_comments_item_created_idx on public.item_comments (item_id, created_at);
create index item_comments_space_id_idx on public.item_comments (space_id);
create index item_comments_user_id_idx on public.item_comments (user_id);

create trigger item_comments_fill_space
before insert on public.item_comments
for each row execute function public.fill_item_space ();

alter table public.item_comments enable row level security;

create policy "members read comments" on public.item_comments
for select to authenticated
using (space_id in (select public.my_space_ids ()));

create policy "members write own comment" on public.item_comments
for insert to authenticated
with check (
  user_id = (select auth.uid ())
  and space_id in (select public.my_space_ids ())
);

create policy "members delete own comment" on public.item_comments
for delete to authenticated
using (user_id = (select auth.uid ()));

-- 이모지 반응 (한 사람이 한 항목에 같은 이모지는 한 번)
create table public.item_reactions (
  item_id uuid not null references public.bucket_items (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  emoji text not null check (emoji in ('❤️', '👍', '😆', '🔥', '🥹', '👏')),
  space_id uuid not null references public.spaces (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (item_id, user_id, emoji)
);

create index item_reactions_space_id_idx on public.item_reactions (space_id);
create index item_reactions_user_id_idx on public.item_reactions (user_id);

create trigger item_reactions_fill_space
before insert on public.item_reactions
for each row execute function public.fill_item_space ();

alter table public.item_reactions enable row level security;

create policy "members read reactions" on public.item_reactions
for select to authenticated
using (space_id in (select public.my_space_ids ()));

create policy "members add own reaction" on public.item_reactions
for insert to authenticated
with check (
  user_id = (select auth.uid ())
  and space_id in (select public.my_space_ids ())
);

create policy "members remove own reaction" on public.item_reactions
for delete to authenticated
using (user_id = (select auth.uid ()));

-- 실시간 (지운 행도 어느 항목 것인지 알 수 있게)
alter table public.item_comments replica identity full;
alter table public.item_reactions replica identity full;
alter publication supabase_realtime add table public.item_comments;
alter publication supabase_realtime add table public.item_reactions;

-- 알림함에 댓글 알림
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('added', 'done', 'reviewed', 'commented'));
