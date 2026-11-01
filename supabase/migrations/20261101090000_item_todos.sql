-- 버킷리스트 항목의 할 것 체크리스트: [{ id, text, done }]
alter table public.bucket_items add column if not exists todos jsonb;
