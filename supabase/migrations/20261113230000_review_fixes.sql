-- 코드 점검에서 나온 서버 쪽 문제들을 고친다.

-- 1) 알림함에 '누가 한 일인지'를 남긴다. 같은 알림을 또 보내지 않을 때 사람을 이름이 아니라 이걸로 구분한다
--    (닉네임 없는 사람은 모두 '멤버'로 보여서, 이름으로 구분하면 다른 사람의 알림이 빠졌다).
alter table public.notifications
  add column actor_id uuid references auth.users (id) on delete set null;

-- 2) 장소 검색(kakao)·링크 미리보기(link)도 사람마다 하루 횟수를 센다 (ai_usage 표와 use_ai 함수를 같이 쓴다).
--    한 사람이 마구 불러 카카오 하루 사용량을 다 써 버리거나 서버를 대신 접속하는 통로로 쓰는 것을 막는다.
alter table public.ai_usage drop constraint ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check
  check (kind in ('ai', 'auto', 'kakao', 'link'));

-- AI 전체 합계에는 AI 호출만 센다
create or replace function public.ai_used_today ()
  returns int language sql stable security definer set search_path = ''
as $$
  select coalesce(sum(count), 0)::int from public.ai_usage
  where day = (now() at time zone 'Asia/Seoul')::date
    and kind in ('ai', 'auto');
$$;

-- 3) 휴지통: 같은 id가 다른 공간의 휴지통에 이미 있으면 덮어쓰지 않는다.
--    (공간에서 나간 사람이 그 공간 휴지통에 있는 항목과 같은 id로 자기 공간에 항목을 만들어 지우면,
--     남의 휴지통 내용이 바뀌고 되살릴 때 그 사람 공간으로 넘어갔다)
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
          deleted_at = now()
      -- 같은 공간의 휴지통 줄일 때만 바꾼다
      where public.trashed_items.space_id = excluded.space_id;
    delete from public.bucket_items where id = v_item.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- 4) 담은 사람(created_by)은 서버가 정한다: 앱이 담을 때는 늘 지금 로그인한 사람이고, 나중에 바꿀 수 없다.
--    (멤버가 다른 멤버가 담은 것처럼 적을 수 있었다. 휴지통에서 되살리기 같은 서버 함수는 그대로 둔다)
create function public.protect_item_creator ()
  returns trigger language plpgsql set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.created_by := auth.uid ();
    else
      new.created_by := old.created_by;
    end if;
  end if;
  return new;
end;
$$;
create trigger bucket_items_protect_creator
before insert or update on public.bucket_items
for each row execute function public.protect_item_creator ();
