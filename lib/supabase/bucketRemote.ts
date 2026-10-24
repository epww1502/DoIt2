/**
 * 버킷리스트 항목·사진을 Supabase와 주고받는 함수들.
 * 화면이나 스토어는 이 파일을 통해서만 서버에 접근한다.
 */
import { randomUUID } from 'expo-crypto';
import { File } from 'expo-file-system';

import type {
  BucketItem,
  BucketKind,
  BucketSetting,
  CategoryKey,
  DoneRecord,
  PlaceInfo,
} from '@/lib/bucket/types';

import { supabase } from './client';
import type { BucketItemRow, Database, Json } from './database.types';

type ItemInsert = Database['public']['Tables']['bucket_items']['Insert'];

const PHOTO_BUCKET = 'photos';
/** 사진 보기 링크 유효 시간(초) */
const SIGNED_URL_SECONDS = 60 * 60;

/** 서버 done 칸 모양 (휴대폰 파일 경로는 서버에 올리지 않는다) */
type RemoteDone = Omit<DoneRecord, 'photoUri'>;

function toRemoteDone(done: DoneRecord | null): RemoteDone | null {
  if (!done) return null;
  return {
    date: done.date,
    rating: done.rating,
    review: done.review,
    photoPath: done.photoPath ?? null,
  };
}

/** 서버 행 → 앱 항목. 이 휴대폰에 같은 사진 파일이 있으면 그대로 쓴다 */
export function fromRow(row: BucketItemRow, local?: BucketItem): BucketItem {
  const remoteDone = row.done as RemoteDone | null;
  const localDone = local?.done;
  const done: DoneRecord | null = remoteDone
    ? {
        ...remoteDone,
        photoUri:
          localDone?.photoPath && localDone.photoPath === remoteDone.photoPath
            ? localDone.photoUri
            : null,
      }
    : null;

  return {
    id: row.id,
    kind: row.kind as BucketKind,
    title: row.title,
    category: row.category as CategoryKey,
    setting: row.setting as BucketSetting,
    location: row.location,
    place: (row.place as PlaceInfo | null) ?? null,
    memo: row.memo,
    createdAt: row.created_at,
    done,
  };
}

function toRow(item: BucketItem, spaceId: string): ItemInsert {
  return {
    id: item.id,
    space_id: spaceId,
    kind: item.kind,
    title: item.title,
    category: item.category,
    setting: item.setting,
    location: item.location,
    place: (item.place ?? null) as Json,
    memo: item.memo,
    done: toRemoteDone(item.done) as Json,
    created_at: item.createdAt,
  };
}

export function newItemId() {
  return randomUUID();
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 예전 버전에서 만든 항목은 id가 uuid가 아니라 서버에 올릴 때 새로 만든다 */
export function ensureUuid(id: string) {
  return UUID_RE.test(id) ? id : randomUUID();
}

export async function fetchItems(spaceId: string): Promise<BucketItemRow[]> {
  const { data, error } = await supabase
    .from('bucket_items')
    .select('*')
    .eq('space_id', spaceId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function upsertItems(items: BucketItem[], spaceId: string) {
  if (items.length === 0) return;
  const { error } = await supabase
    .from('bucket_items')
    .upsert(items.map((it) => toRow(it, spaceId)));
  if (error) throw error;
}

export async function deleteItems(ids: string[]) {
  if (ids.length === 0) return;
  const { error } = await supabase.from('bucket_items').delete().in('id', ids);
  if (error) throw error;
}

/** 휴대폰 사진을 서버에 올리고 저장소 경로를 돌려준다 */
export async function uploadPhoto(localUri: string, spaceId: string) {
  const file = new File(localUri);
  const ext = (file.extension || '.jpg').replace('.', '').toLowerCase();
  const contentType =
    ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const path = `${spaceId}/${randomUUID()}.${ext === 'jpeg' ? 'jpg' : ext}`;

  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, await file.arrayBuffer(), { contentType });
  if (error) throw error;
  return path;
}

export async function removePhoto(path: string | null | undefined) {
  if (!path) return;
  await supabase.storage.from(PHOTO_BUCKET).remove([path]);
}

/** 상대가 올린 사진처럼 휴대폰에 없는 사진을 볼 수 있는 임시 링크 */
export async function getPhotoUrl(path: string) {
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}
