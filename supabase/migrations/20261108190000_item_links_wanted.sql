-- 버킷리스트 항목의 참고 링크 ([{ url, title, image, site }], 없으면 null)
-- 따로 칸을 둬서 링크를 모르는 예전 앱이 항목을 고쳐도 링크가 지워지지 않게 한다
alter table public.bucket_items add column links jsonb;

-- 알림함 detail에 '하고 싶어요'를 더한다 (예전 앱은 kind 'added'로 본다)
alter table public.notifications drop constraint notifications_detail_check;
alter table public.notifications
  add constraint notifications_detail_check
  check (detail in ('photos', 'liked', 'wanted'));
