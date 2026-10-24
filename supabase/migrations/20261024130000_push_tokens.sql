-- 푸시 알림: 폰마다 Expo 푸시 토큰. 한 사람이 폰 여러 대를 쓸 수 있다
create table public.push_tokens (
  token text primary key,
  user_id uuid not null default auth.uid () references auth.users (id) on delete cascade,
  platform text not null default 'android',
  updated_at timestamptz not null default now()
);
create index push_tokens_user_id_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

-- 내 토큰만 넣고 지운다 (보내기는 Edge Function notify가 서비스 키로 읽는다)
create policy "own tokens read" on public.push_tokens for select to authenticated
  using (user_id = (select auth.uid ()));
create policy "own tokens insert" on public.push_tokens for insert to authenticated
  with check (user_id = (select auth.uid ()));
create policy "own tokens update" on public.push_tokens for update to authenticated
  using (user_id = (select auth.uid ()))
  with check (user_id = (select auth.uid ()));
create policy "own tokens delete" on public.push_tokens for delete to authenticated
  using (user_id = (select auth.uid ()));

-- 같은 폰을 다른 계정으로 불러오면(계정 코드) 토큰 주인을 바꿔야 해서, 내 것으로 가져오는 함수
create function public.claim_push_token (push_token text, push_platform text)
  returns void language sql security definer set search_path = ''
as $$
  insert into public.push_tokens (token, user_id, platform, updated_at)
  values (push_token, (select auth.uid ()), push_platform, now())
  on conflict (token) do update
    set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
$$;
revoke execute on function public.claim_push_token (text, text) from public, anon;
grant execute on function public.claim_push_token (text, text) to authenticated;
