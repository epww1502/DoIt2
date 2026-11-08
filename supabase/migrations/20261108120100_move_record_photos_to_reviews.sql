-- 함께 쓰던 기록 사진(bucket_items.done.photos)을 올린 사람의 평가(item_reviews.photos)로 옮긴다.
-- 올린 사람은 저장소 파일 주인(storage.objects.owner)으로 찾는다.
-- 올린 사람의 평가가 없는 사진은 기록에 그대로 둔다 (새 앱이 '함께한 사진'으로 보여준다).
-- 새 앱(EAS Update)을 내보낸 뒤에 실행한다. 먼저 실행하면 예전 앱에서는 사진이 안 보인다.

with photo as (
  select b.id as item_id, ph->>'path' as path, t.ord, o.owner
  from public.bucket_items b
  cross join lateral jsonb_array_elements(coalesce(b.done->'photos', '[]'::jsonb))
    with ordinality as t(ph, ord)
  join storage.objects o on o.bucket_id = 'photos' and o.name = ph->>'path'
  where b.done is not null
),
movable as (
  select p.*
  from photo p
  join public.item_reviews r on r.item_id = p.item_id and r.user_id = p.owner
),
moved as (
  update public.item_reviews r
  set photos = (
    select jsonb_agg(path order by ord)
    from (
      -- 이미 평가에 있던 사진 다음에 옮긴 사진 (같은 경로는 한 번만)
      select e.value #>> '{}' as path, e.ordinality as ord
      from jsonb_array_elements(coalesce(r.photos, '[]'::jsonb)) with ordinality e
      union
      select m.path, 1000 + m.ord
      from movable m
      where m.item_id = r.item_id and m.owner = r.user_id
    ) all_paths
  )
  where exists (
    select 1 from movable m where m.item_id = r.item_id and m.owner = r.user_id
  )
  returning r.item_id
)
update public.bucket_items b
set done = jsonb_set(
  jsonb_set(
    b.done,
    '{photos}',
    coalesce(
      (
        select jsonb_agg(ph order by ord)
        from jsonb_array_elements(b.done->'photos') with ordinality as t(ph, ord)
        where ph->>'path' not in (select m.path from movable m where m.item_id = b.id)
      ),
      '[]'::jsonb
    )
  ),
  '{photoPath}',
  coalesce(
    (
      select to_jsonb(ph->>'path')
      from jsonb_array_elements(b.done->'photos') with ordinality as t(ph, ord)
      where ph->>'path' not in (select m.path from movable m where m.item_id = b.id)
      order by ord
      limit 1
    ),
    'null'::jsonb
  )
)
where b.id in (select item_id from moved);
