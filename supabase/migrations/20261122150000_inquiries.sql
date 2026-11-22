-- 앱 안에서 보내는 문의 (도움말 > 문의하기).
-- 넣기는 서버 함수(inquiry)만 한다: 하루에 보낼 수 있는 수를 세고, 관리자에게 푸시를 보낸다.
-- 읽기는 보낸 사람 자신과 관리자만. 관리자는 답했는지(handled_at)만 바꿀 수 있다.

-- 관리자 (문의 목록을 볼 수 있는 계정). 앱에서는 읽을 수 없고, 누구인지는 SQL로 넣는다:
--   insert into public.app_admins (user_id) values ('<계정 id>');
create table public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

-- 지금 로그인한 사람이 관리자인지 (앱이 문의 목록 줄을 보여줄지 정할 때, 아래 정책에서도 쓴다)
create function public.is_app_admin ()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.app_admins where user_id = (select auth.uid ())
  );
$$;

revoke execute on function public.is_app_admin () from public, anon;
grant execute on function public.is_app_admin () to authenticated;

create table public.inquiries (
  id uuid primary key default gen_random_uuid (),
  created_at timestamptz not null default now(),
  -- 계정을 지우면 그 사람이 보낸 문의도 지운다
  user_id uuid not null references auth.users (id) on delete cascade,
  message text not null check (char_length(message) between 1 and 1000),
  -- 답장받을 연락처 (선택). 가입 없이 쓰는 앱이라 적지 않으면 답할 길이 없다
  contact text check (char_length(contact) <= 100),
  platform text check (char_length(platform) <= 20),
  app_version text check (char_length(app_version) <= 20),
  -- 관리자가 답했다고 표시한 시각
  handled_at timestamptz
);

create index inquiries_created_at_idx on public.inquiries (created_at desc);
create index inquiries_user_id_idx on public.inquiries (user_id, created_at desc);

alter table public.inquiries enable row level security;

create policy "read own inquiries or all as admin" on public.inquiries for select
  to authenticated
  using (user_id = (select auth.uid ()) or (select public.is_app_admin ()));

create policy "admin marks inquiries handled" on public.inquiries for update
  to authenticated
  using ((select public.is_app_admin ()))
  with check ((select public.is_app_admin ()));

revoke all on public.inquiries from anon, authenticated;
grant select on public.inquiries to authenticated;
grant update (handled_at) on public.inquiries to authenticated;

comment on table public.inquiries is '앱 안에서 보낸 문의 (넣기는 서버 함수 inquiry만)';
comment on table public.app_admins is '문의 목록을 볼 수 있는 관리자 계정';
