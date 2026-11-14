-- 추억 공유: 한 해 돌아보기를 웹 페이지(site/memories.html)로 나눈다.
-- 만든 사람이 고른 숫자·기록·사진의 사본만 담고, 링크(id)를 아는 사람은 로그인 없이 볼 수 있다.
-- 공간과는 이어져 있지 않다: 공간을 나가도 남고, 30일이 지나거나 만든 사람이 끄거나 계정을 지우면 사라진다.
create table public.shared_memories (
  -- 링크에 들어가는 값이라 맞힐 수 없어야 한다 (gen_random_uuid는 122비트 난수)
  id uuid primary key default gen_random_uuid (),
  created_by uuid not null default auth.uid () references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 40),
  year int not null check (year between 2000 and 2100),
  -- 웹 페이지가 그릴 내용 (lib/bucket/memoryShare.ts의 MemoryPayload)
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  -- 지나면 더는 열리지 않는다. 올린 사진은 만든 사람의 앱이 다음에 켜질 때 지운다 (lib/supabase/memoryShare.ts)
  expires_at timestamptz not null default now() + interval '30 days'
);
create index shared_memories_created_by_idx on public.shared_memories (created_by);

alter table public.shared_memories enable row level security;

-- 내가 만든 것만 보고 끌 수 있다. 만들기는 아래 함수로만 (크기·개수를 확인하려고)
create policy "own shared memories read" on public.shared_memories
for select to authenticated
using (created_by = (select auth.uid ()));

create policy "own shared memories delete" on public.shared_memories
for delete to authenticated
using (created_by = (select auth.uid ()));

-- 만들기: 새 링크의 id를 돌려준다. 사진은 이 id 폴더로 따로 올린다
create function public.create_shared_memory (memory_title text, memory_year int, memory_payload jsonb)
  returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid ();
  new_id uuid;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if jsonb_typeof(memory_payload) <> 'object'
     or octet_length(memory_payload::text) > 20000
     or (memory_payload ? 'photos' and (
       jsonb_typeof(memory_payload->'photos') <> 'array'
       or jsonb_array_length(memory_payload->'photos') > 12
     )) then
    raise exception 'invalid_payload' using errcode = 'P0001';
  end if;
  -- 한 사람이 켜 둘 수 있는 링크 수 (공개 저장소를 마구 쓰지 못하게). 기간이 지났어도 사진을 지우기 전이면 센다
  if (select count(*) from public.shared_memories where created_by = uid) >= 20 then
    raise exception 'too_many_shares' using errcode = 'P0001';
  end if;

  insert into public.shared_memories (created_by, title, year, payload)
  values (
    uid,
    left(coalesce(nullif(btrim(memory_title), ''), '돌아보기'), 40),
    memory_year,
    memory_payload
  )
  returning id into new_id;
  return new_id;
end;
$$;
revoke execute on function public.create_shared_memory (text, int, jsonb) from public, anon;
grant execute on function public.create_shared_memory (text, int, jsonb) to authenticated;

-- 보기: 로그인 없이도 부를 수 있다 (웹 페이지). 없거나 기간이 지난 링크면 null
create function public.get_shared_memory (share_id uuid)
  returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'title', s.title,
    'year', s.year,
    'payload', s.payload,
    'created_at', s.created_at,
    'expires_at', s.expires_at
  )
  from public.shared_memories s
  where s.id = share_id
    and s.expires_at > now();
$$;
revoke execute on function public.get_shared_memory (uuid) from public;
grant execute on function public.get_shared_memory (uuid) to anon, authenticated;

-- 공유한 사진: 공개 버킷, 경로는 {공유 id}/{0~11}.jpg
-- 주소를 아는 사람만 볼 수 있고 (목록은 못 본다), 앱이 JPEG로 다시 저장해서 올린다 (촬영 위치 같은 정보가 빠진다)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shared', 'shared', true, 2097152, array['image/jpeg']);

-- 내가 만든 공유의 폴더에만 올리고 지울 수 있다
create policy "own shared photos read" on storage.objects
for select to authenticated
using (
  bucket_id = 'shared'
  and (storage.foldername (name))[1] in (
    select s.id::text from public.shared_memories s where s.created_by = (select auth.uid ())
  )
);

create policy "own shared photos upload" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'shared'
  and array_length(storage.foldername (name), 1) = 1
  and (storage.foldername (name))[1] in (
    select s.id::text from public.shared_memories s
    where s.created_by = (select auth.uid ()) and s.expires_at > now()
  )
  and storage.filename (name) ~ '^([0-9]|1[01])\.jpg$'
);

create policy "own shared photos delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'shared'
  and (storage.foldername (name))[1] in (
    select s.id::text from public.shared_memories s where s.created_by = (select auth.uid ())
  )
);
