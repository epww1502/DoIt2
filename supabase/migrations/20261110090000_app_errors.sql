-- 앱 오류 기록: 사용자 폰에서 난 오류를 모아 본다 (오류 수집 도구 대신).
-- 앱은 넣기만 하고, 읽기는 대시보드·SQL(서비스 키)로만 한다.
create table public.app_errors (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  -- 언제 났는지 (꺼지기 직전에 적어 두었다가 다음에 켤 때 보내면 created_at과 다르다)
  occurred_at timestamptz not null,
  user_id uuid default auth.uid () references auth.users (id) on delete set null,
  -- crash: 처리되지 않아 앱이 꺼짐 / screen: 화면을 그리다 터짐 / alert: 사용자에게 오류 팝업을 띄움
  kind text not null check (kind in ('crash', 'screen', 'alert')),
  platform text not null check (char_length(platform) <= 20),
  app_version text check (char_length(app_version) <= 20),
  update_id text check (char_length(update_id) <= 64),
  title text check (char_length(title) <= 200),
  message text not null check (char_length(message) <= 1000),
  stack text check (char_length(stack) <= 4000)
);
create index app_errors_created_at_idx on public.app_errors (created_at desc);

alter table public.app_errors enable row level security;

-- 로그인 전(anon)에도 남길 수 있다. 남의 이름으로는 못 남긴다
create policy "anyone inserts own errors" on public.app_errors for insert
  to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid ()));

grant insert on public.app_errors to anon, authenticated;
