-- 알림 종류별 켜고 끄기: 내가 끈 알림 묶음. notify 함수가 이 묶음은 푸시를 보내지 않는다 (알림함에는 남긴다)
-- 묶음: added(새로 담음) record(기록·평가·사진) todo(할 것 체크) comment(댓글) like(사진 하트) plan(하고 싶어요·같이 갈 날)
alter table public.profiles
  add column push_muted text[] not null default '{}'
  check (push_muted <@ array['added', 'record', 'todo', 'comment', 'like', 'plan']);

comment on column public.profiles.push_muted is '푸시를 받지 않을 알림 묶음 (앱 lib/pushPrefs.ts와 같게)';
