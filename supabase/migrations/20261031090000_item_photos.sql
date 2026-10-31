-- 버킷리스트 항목 사진 (최대 3장): 저장소 경로 목록 ["{space_id}/{파일 이름}", ...].
-- 첫 번째가 대표 사진이고, 목록에서 카테고리 이모지 대신 보인다.
-- 별도 컬럼이라 이 값을 모르는 예전 앱이 항목을 저장해도 사진이 지워지지 않는다.
alter table public.bucket_items add column photos jsonb;
