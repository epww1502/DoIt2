-- 함께한 기록 사진: 비공개 버킷, 경로는 {couple_id}/{파일 이름}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

create policy "members read couple photos" on storage.objects
for select to authenticated
using (
  bucket_id = 'photos'
  and (storage.foldername (name))[1] = (select public.my_couple_id ())::text
);

create policy "members upload couple photos" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'photos'
  and (storage.foldername (name))[1] = (select public.my_couple_id ())::text
);

create policy "members update couple photos" on storage.objects
for update to authenticated
using (
  bucket_id = 'photos'
  and (storage.foldername (name))[1] = (select public.my_couple_id ())::text
);

create policy "members delete couple photos" on storage.objects
for delete to authenticated
using (
  bucket_id = 'photos'
  and (storage.foldername (name))[1] = (select public.my_couple_id ())::text
);

-- 실시간: 한 사람이 바꾸면 상대 휴대폰에 바로 반영 (RLS가 그대로 적용된다)
alter publication supabase_realtime add table public.bucket_items;
alter publication supabase_realtime add table public.couple_members;
