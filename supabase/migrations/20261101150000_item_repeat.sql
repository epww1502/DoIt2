-- 매년 하기: { every: 'year', restUntil?: 'YYYY-MM-DD' }
-- 해내면 앱이 다음 해 것을 restUntil(쉬는 기간)과 함께 새로 담는다
alter table public.bucket_items add column repeat jsonb;
