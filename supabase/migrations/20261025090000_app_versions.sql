-- 앱 버전 안내: 설치된 앱(빌드) 버전이 min_version보다 낮으면 업데이트를 꼭 하게 한다.
-- 새 빌드를 스토어에 올린 뒤 이 표의 값만 바꾸면 된다 (앱을 다시 배포할 필요 없음).
create table public.app_versions (
  platform text primary key check (platform in ('android', 'ios')),
  min_version text not null,
  store_url text not null,
  message text,
  updated_at timestamptz not null default now()
);

alter table public.app_versions enable row level security;

-- 누구나 읽기만 할 수 있다 (바꾸는 건 대시보드·SQL로만)
create policy "app_versions are readable"
  on public.app_versions for select
  to anon, authenticated
  using (true);

grant select on public.app_versions to anon, authenticated;

-- iOS는 아직 App Store에 없어서 소개 페이지를 넣어둔다. 출시하면 App Store 주소로 바꾼다.
insert into public.app_versions (platform, min_version, store_url)
values
  ('android', '0.2.0', 'https://play.google.com/store/apps/details?id=com.doit2.app'),
  ('ios', '0.2.0', 'https://doit2app.github.io');
