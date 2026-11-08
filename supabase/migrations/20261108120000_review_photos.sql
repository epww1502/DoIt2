-- 기록 사진을 사람마다 따로: 내 평가에 내가 올린 사진 경로들을 둔다 (최대 5장, 앱이 지킨다)
-- 예전 앱은 이 칸을 보내지 않아서, 평가를 고쳐도 사진이 지워지지 않는다
alter table public.item_reviews
  add column if not exists photos jsonb;

comment on column public.item_reviews.photos is
  '내가 올린 기록 사진의 저장소 경로 목록 ["{space_id}/{파일}", ...]. 없으면 null';
