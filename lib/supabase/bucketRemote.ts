/**
 * 버킷리스트 항목·사진을 Supabase와 주고받는 함수들.
 * 화면이나 스토어는 이 파일을 통해서만 서버에 접근한다.
 */
import { randomUUID } from '@/lib/uuid';
import { File } from 'expo-file-system';

import {
  itemPhotos,
  itemTodos,
  type ItemTodo,
  type TodoOp,
  recordPhotos,
  withRecordPhotos,
  type BucketItem,
  type BucketKind,
  type BucketSetting,
  type CategoryKey,
  type DoneRecord,
  type GoalInfo,
  type ItemReview,
  type PlaceInfo,
  type RecordPhoto,
  type RepeatInfo,
  type StartedInfo,
} from '@/lib/bucket/types';

import { supabase } from './client';
import type {
  BucketItemRow,
  Database,
  ItemReviewRow,
  Json,
} from './database.types';

type ItemInsert = Database['public']['Tables']['bucket_items']['Insert'];

const PHOTO_BUCKET = 'photos';
/** 사진 보기 링크 유효 시간(초) */
const SIGNED_URL_SECONDS = 60 * 60;

/** 서버 done 칸 모양 (휴대폰 파일 경로는 서버에 올리지 않는다) */
type RemoteDone = Omit<DoneRecord, 'photoUri' | 'photos'> & {
  /** 사진 여러 장의 서버 경로. 예전 기록에는 없고 photoPath 한 장만 있다 */
  photos?: { path: string }[];
};

function toRemoteDone(done: DoneRecord | null): RemoteDone | null {
  if (!done) return null;
  const paths = recordPhotos(done)
    .map((p) => p.path)
    .filter((p): p is string => Boolean(p));
  return {
    date: done.date,
    ...(done.startDate ? { startDate: done.startDate } : {}),
    rating: done.rating,
    review: done.review,
    // 예전 앱은 photoPath 한 장만 읽는다
    photoPath: paths[0] ?? null,
    photos: paths.map((path) => ({ path })),
  };
}

/** 서버 photos 칸(경로 목록) → 사진 목록. 이 폰에 같은 사진 파일이 있으면 그 파일을 쓴다 */
function photosFromRow(
  value: Json | null | undefined,
  local: RecordPhoto[]
): RecordPhoto[] {
  if (!Array.isArray(value)) return [];
  const localUris = new Map(
    local.filter((p) => p.path && p.uri).map((p) => [p.path!, p.uri])
  );
  return value
    .filter((path): path is string => typeof path === 'string' && !!path)
    .map((path) => ({ path, uri: localUris.get(path) ?? null }));
}

/** 사진 목록 → 서버 photos 칸 (아직 못 올린 사진은 빼고, 없으면 null) */
function photosToRow(photos: RecordPhoto[]): Json {
  const paths = photos.map((p) => p.path).filter((p): p is string => !!p);
  return paths.length > 0 ? paths : null;
}

/** 서버 행 → 앱 항목. 이 휴대폰에 같은 사진 파일이 있으면 그대로 쓴다 */
/** 서버 항목 행 + 사람별 평가 (fetchItems가 함께 받아온다. 실시간 행에는 없다) */
export type ItemRowWithReviews = BucketItemRow & {
  item_reviews?: ItemReviewRow[];
  /** PostgREST 개수 집계: [{ count }] */
  item_comments?: { count: number }[];
};

/** 서버 평가 행 → 앱 평가. local: 이 폰에 있던 같은 사람 평가 (같은 사진 파일을 그대로 쓴다) */
export function reviewFromRow(
  row: ItemReviewRow,
  local?: ItemReview | null
): ItemReview {
  return {
    userId: row.user_id,
    rating: row.rating,
    review: row.review,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    photos: photosFromRow(row.photos, local?.photos ?? []),
  };
}

/** 서버 행 → 앱 항목. 평가가 같이 안 왔으면(실시간) 폰에 있던 평가를 그대로 둔다 */
export function fromRow(
  row: ItemRowWithReviews,
  local?: BucketItem
): BucketItem {
  const remoteDone = row.done as RemoteDone | null;
  let done: DoneRecord | null = null;
  if (remoteDone) {
    const localUris = new Map(
      recordPhotos(local?.done)
        .filter((p) => p.path && p.uri)
        .map((p) => [p.path!, p.uri])
    );
    const paths = remoteDone.photos
      ? remoteDone.photos.map((p) => p.path)
      : remoteDone.photoPath
        ? [remoteDone.photoPath]
        : [];
    done = withRecordPhotos(
      {
        date: remoteDone.date,
        startDate: remoteDone.startDate ?? null,
        rating: remoteDone.rating,
        review: remoteDone.review,
        photoUri: null,
      },
      paths.map((path) => ({ path, uri: localUris.get(path) ?? null }))
    );
  }

  return {
    id: row.id,
    kind: row.kind as BucketKind,
    title: row.title,
    category: row.category as CategoryKey,
    setting: row.setting as BucketSetting,
    location: row.location,
    place: (row.place as PlaceInfo | null) ?? null,
    memo: row.memo,
    photos: photosFromRow(row.photos, itemPhotos(local)),
    todos: itemTodos({ todos: (row.todos as ItemTodo[] | null) ?? [] }),
    createdAt: row.created_at,
    createdBy: row.created_by ?? null,
    done,
    goal: (row.goal as GoalInfo | null) ?? null,
    repeat: (row.repeat as RepeatInfo | null) ?? null,
    started: (row.started as StartedInfo | null) ?? null,
    reviews: row.item_reviews
      ? row.item_reviews.map((r) =>
          reviewFromRow(
            r,
            local?.reviews?.find((l) => l.userId === r.user_id)
          )
        )
      : (local?.reviews ?? []),
    commentCount: row.item_comments
      ? (row.item_comments[0]?.count ?? 0)
      : (local?.commentCount ?? 0),
  };
}

/** withTodos가 false면 할 것 칸은 아예 보내지 않는다 (서버 목록을 덮어쓰지 않게) */
function toRow(
  item: BucketItem,
  spaceId: string,
  withTodos: boolean
): ItemInsert {
  const row: ItemInsert = {
    id: item.id,
    space_id: spaceId,
    kind: item.kind,
    title: item.title,
    category: item.category,
    setting: item.setting,
    location: item.location,
    place: (item.place ?? null) as Json,
    memo: item.memo,
    photos: photosToRow(itemPhotos(item)),
    todos: (itemTodos(item).length > 0 ? itemTodos(item) : null) as Json,
    done: toRemoteDone(item.done) as Json,
    goal: (item.goal ?? null) as Json,
    repeat: (item.repeat ?? null) as Json,
    started: (item.started ?? null) as Json,
    created_at: item.createdAt,
  };
  if (!withTodos) delete row.todos;
  return row;
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

export async function fetchItems(
  spaceId: string
): Promise<ItemRowWithReviews[]> {
  const { data, error } = await supabase
    .from('bucket_items')
    .select('*, item_reviews(*), item_comments(count)')
    .eq('space_id', spaceId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * 항목을 저장한다. withTodos(id)가 false인 항목은 할 것 칸을 빼고 보낸다.
 * 한 번에 보내는 행은 칸이 같아야 해서(빠진 칸은 비워진다) 둘로 나눠 보낸다.
 */
export async function upsertItems(
  items: BucketItem[],
  spaceId: string,
  withTodos: (id: string) => boolean = () => true
) {
  const groups = [true, false].map((todos) =>
    items
      .filter((it) => withTodos(it.id) === todos)
      .map((it) => toRow(it, spaceId, todos))
  );
  for (const rows of groups) {
    if (rows.length === 0) continue;
    const { error } = await supabase.from('bucket_items').upsert(rows);
    if (error) throw error;
  }
}

/** 할 것 체크·추가를 서버의 지금 목록에 반영한다 */
export async function applyTodoOps(itemId: string, ops: TodoOp[]) {
  if (ops.length === 0) return;
  const { error } = await supabase.rpc('apply_item_todo_ops', {
    p_item_id: itemId,
    p_ops: ops as unknown as Json,
  });
  if (error) throw error;
}

/** 내 평가 저장 (rating null: 건너뜀). 사진은 서버에 올라간 것만 보낸다 */
export async function upsertReview(
  itemId: string,
  spaceId: string,
  userId: string,
  review: Pick<ItemReview, 'rating' | 'review' | 'photos'>
) {
  const { error } = await supabase.from('item_reviews').upsert({
    item_id: itemId,
    // 서버 트리거가 항목의 공간으로 다시 채운다
    space_id: spaceId,
    user_id: userId,
    rating: review.rating,
    review: review.review,
    photos: photosToRow(review.photos ?? []),
  });
  if (error) throw error;
}

/** 내 평가 지우기 */
export async function deleteReview(itemId: string, userId: string) {
  const { error } = await supabase
    .from('item_reviews')
    .delete()
    .eq('item_id', itemId)
    .eq('user_id', userId);
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

/** 서버 사진을 지운다. 실패하면 던진다 (대기열이 나중에 다시 지운다) */
export async function removePhoto(path: string | null | undefined) {
  if (!path) return;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([path]);
  if (error) throw error;
}

/**
 * 임시 링크 여러 개를 한 번에. 받지 못한 경로는 결과에 없다.
 * 실패하면(인터넷 등) 던진다
 */
export async function getPhotoUrls(paths: string[]) {
  const urls = new Map<string, string>();
  for (let i = 0; i < paths.length; i += 100) {
    const { data, error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(paths.slice(i, i + 100), SIGNED_URL_SECONDS);
    if (error) throw error;
    for (const row of data ?? []) {
      if (row.path && row.signedUrl && !row.error) {
        urls.set(row.path, row.signedUrl);
      }
    }
  }
  return urls;
}

/** 상대가 올린 사진처럼 휴대폰에 없는 사진을 볼 수 있는 임시 링크 */
export async function getPhotoUrl(path: string) {
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}
