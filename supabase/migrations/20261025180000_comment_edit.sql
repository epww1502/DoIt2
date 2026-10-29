-- 댓글 수정: 내 댓글 내용만 고칠 수 있고, 고치면 edited_at이 찍힌다 (앱에서 '(수정됨)')
alter table public.item_comments add column edited_at timestamptz;

create function public.item_comments_mark_edited () returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.body is distinct from old.body then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

revoke execute on function public.item_comments_mark_edited () from public, anon, authenticated;

create trigger item_comments_mark_edited
before update on public.item_comments
for each row execute function public.item_comments_mark_edited ();

create policy "members update own comment" on public.item_comments
for update to authenticated
using (user_id = (select auth.uid ()))
with check (user_id = (select auth.uid ()));

-- 내용(body)만 바꿀 수 있다
revoke update on public.item_comments from anon, authenticated;
grant update (body) on public.item_comments to authenticated;
