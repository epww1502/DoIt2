-- 버킷리스트 공유: 고른 항목의 사본을 코드로 나눠준다 (공간 초대와 달리 사본만 넘어간다)
create table public.shared_lists (
  id uuid primary key default gen_random_uuid (),
  code text not null unique,
  title text not null check (char_length(title) between 1 and 40),
  -- [{ kind, title, category, setting, location, place, memo }]
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  created_by uuid not null default auth.uid () references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- 오래된 공유는 더 이상 못 받는다
  expires_at timestamptz not null default now() + interval '30 days'
);

-- 앱에서 직접은 읽고 쓰지 못한다 (아래 함수로만)
alter table public.shared_lists enable row level security;

-- 헷갈리는 글자를 뺀 6자리 코드
create function public.generate_share_code ()
  returns text language plpgsql set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidate text;
begin
  loop
    candidate := '';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.shared_lists s where s.code = candidate);
  end loop;
  return candidate;
end;
$$;
revoke execute on function public.generate_share_code () from public, anon, authenticated;

-- 공유 만들기: 항목은 필요한 칸만 남기고 저장한다 (기록·사진은 넘기지 않는다)
create function public.create_shared_list (list_title text, list_items jsonb)
  returns text language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid ();
  new_code text;
  cleaned jsonb;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if jsonb_typeof(list_items) <> 'array'
     or jsonb_array_length(list_items) = 0
     or jsonb_array_length(list_items) > 100 then
    raise exception 'invalid_items' using errcode = 'P0001';
  end if;
  -- 너무 많이 만들지 못하게 (하루 50개)
  if (select count(*) from public.shared_lists
      where created_by = uid and created_at > now() - interval '1 day') >= 50 then
    raise exception 'too_many_shares' using errcode = 'P0001';
  end if;

  select jsonb_agg(jsonb_build_object(
    'kind', e->'kind',
    'title', left(coalesce(e->>'title', ''), 40),
    'category', e->'category',
    'setting', e->'setting',
    'location', left(coalesce(e->>'location', ''), 40),
    'place', e->'place',
    'memo', left(coalesce(e->>'memo', ''), 500)
  ))
  into cleaned
  from jsonb_array_elements(list_items) e
  where coalesce(e->>'title', '') <> '';

  if cleaned is null then
    raise exception 'invalid_items' using errcode = 'P0001';
  end if;

  new_code := public.generate_share_code ();
  insert into public.shared_lists (code, title, items, created_by)
  values (new_code, left(coalesce(nullif(btrim(list_title), ''), '버킷리스트'), 40), cleaned, uid);
  return new_code;
end;
$$;
revoke execute on function public.create_shared_list (text, jsonb) from public, anon;
grant execute on function public.create_shared_list (text, jsonb) to authenticated;

-- 코드로 공유받기 (만료된 건 없음). 보낸 사람은 기본 닉네임만 (없으면 null)
create function public.get_shared_list (share_code text)
  returns table (title text, items jsonb, sender text, created_at timestamptz)
  language sql stable security definer set search_path = ''
as $$
  select s.title, s.items, p.nickname, s.created_at
  from public.shared_lists s
  left join public.profiles p on p.user_id = s.created_by
  where s.code = upper(btrim(share_code))
    and s.expires_at > now();
$$;
revoke execute on function public.get_shared_list (text) from public, anon;
grant execute on function public.get_shared_list (text) to authenticated;
