-- 댓글 이모지 반응 (한 사람이 한 댓글에 같은 이모지는 한 번)
-- item_id·space_id는 댓글에서 트리거가 채운다 (다른 공간 id로 권한을 피하지 못하게)

create function public.fill_comment_reaction () returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select item_id, space_id into new.item_id, new.space_id
  from public.item_comments where id = new.comment_id;
  if new.space_id is null then
    raise exception 'comment_not_found';
  end if;
  return new;
end;
$$;

revoke execute on function public.fill_comment_reaction () from public, anon, authenticated;

create table public.comment_reactions (
  comment_id uuid not null references public.item_comments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  emoji text not null check (emoji in ('❤️', '👍', '😆', '🔥', '🥹', '👏')),
  item_id uuid not null references public.bucket_items (id) on delete cascade,
  space_id uuid not null references public.spaces (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id, emoji)
);

create index comment_reactions_item_id_idx on public.comment_reactions (item_id);
create index comment_reactions_space_id_idx on public.comment_reactions (space_id);
create index comment_reactions_user_id_idx on public.comment_reactions (user_id);

create trigger comment_reactions_fill
before insert on public.comment_reactions
for each row execute function public.fill_comment_reaction ();

alter table public.comment_reactions enable row level security;

-- 읽기: 공간 멤버, 내가 차단한 사람 것은 뺀다
create policy "members read comment reactions" on public.comment_reactions
for select to authenticated
using (
  space_id in (select public.my_space_ids ())
  and user_id not in (
    select blocked_id from public.user_blocks where blocker_id = (select auth.uid ())
  )
);

create policy "members add own comment reaction" on public.comment_reactions
for insert to authenticated
with check (
  user_id = (select auth.uid ())
  and space_id in (select public.my_space_ids ())
);

create policy "members remove own comment reaction" on public.comment_reactions
for delete to authenticated
using (user_id = (select auth.uid ()));

alter table public.comment_reactions replica identity full;
alter publication supabase_realtime add table public.comment_reactions;
