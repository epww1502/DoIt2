-- 공간 아이콘을 사진으로도: 사진 저장소(photos) 경로 {space_id}/{파일 이름}. 없으면 이모지를 쓴다
alter table public.spaces
  add column image_path text check (image_path is null or char_length(image_path) <= 200);
