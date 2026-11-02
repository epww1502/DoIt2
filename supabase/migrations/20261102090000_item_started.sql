-- 시작하기: 며칠 걸리는 항목을 '진행 중'으로 표시한다. { "date": "YYYY-MM-DD" } (선택)
-- 해내면 앱이 시작일을 done.startDate로 옮기고 이 칸은 비운다
alter table public.bucket_items add column started jsonb;
