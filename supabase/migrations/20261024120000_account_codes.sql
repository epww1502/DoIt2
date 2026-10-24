-- 계정 코드: 익명 계정을 다른 폰에서 다시 불러오기 위한 비밀 코드.
-- 코드는 해시만 저장하고, Edge Function(account-code)만 서비스 키로 읽고 쓴다.
create table public.account_codes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code_hash text not null unique,
  created_at timestamptz not null default now()
);

-- 정책이 없으므로 앱(anon·authenticated)에서는 읽기·쓰기 모두 막힌다
alter table public.account_codes enable row level security;
