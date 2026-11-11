/**
 * 휴지통: 공간 항목을 지우면 서버(trashed_items)에 48시간 동안 통째로 남는다.
 * 그 안에는 누구나(같은 공간) 되살릴 수 있고, 지나면 앱이 사진을 정리하고 지운다.
 */
import dayjs from 'dayjs';

import { itemPhotos, recordPhotos, type BucketItem } from '@/lib/bucket/types';
import { reviewPhotos } from '@/lib/bucket/reviews';
import { fromRow } from '@/lib/supabase/bucketRemote';
import { supabase } from '@/lib/supabase/client';
import type {
  BucketItemRow,
  ItemReviewRow,
  TrashedItemRow,
} from '@/lib/supabase/database.types';
import { useOutboxStore } from '@/store/useOutboxStore';

/** 휴지통에 남아 있는 시간 */
export const TRASH_HOURS = 48;

export type TrashEntry = {
  id: string;
  title: string;
  deletedBy: string | null;
  deletedAt: string;
  /** 사라지는 때 */
  expiresAt: string;
  /** 보관해 둔 항목 (대표 사진·종류 아이콘을 보여주려고) */
  item: BucketItem | null;
};

type Snapshot = {
  item?: BucketItemRow;
  reviews?: ItemReviewRow[];
};

function snapshotItem(row: TrashedItemRow): BucketItem | null {
  const snap = row.snapshot as Snapshot | null;
  if (!snap?.item) return null;
  try {
    return fromRow({ ...snap.item, item_reviews: snap.reviews ?? [] });
  } catch {
    return null;
  }
}

function toEntry(row: TrashedItemRow): TrashEntry {
  return {
    id: row.id,
    title: row.title,
    deletedBy: row.deleted_by,
    deletedAt: row.deleted_at,
    expiresAt: dayjs(row.deleted_at).add(TRASH_HOURS, 'hour').toISOString(),
    item: snapshotItem(row),
  };
}

/** 보관한 항목의 서버 사진 경로 (항목·기록·사람별 평가 사진) */
function photoPaths(item: BucketItem | null) {
  if (!item) return [];
  return [
    ...itemPhotos(item),
    ...recordPhotos(item.done),
    ...(item.reviews ?? []).flatMap(reviewPhotos),
  ]
    .map((p) => p.path)
    .filter((p): p is string => Boolean(p));
}

/** 이 공간 휴지통 (최근에 지운 것부터). 48시간 지난 것은 빼고 정리한다 */
export async function fetchTrash(spaceId: string): Promise<TrashEntry[]> {
  const { data, error } = await supabase
    .from('trashed_items')
    .select('*')
    .eq('space_id', spaceId)
    .order('deleted_at', { ascending: false });
  if (error) throw error;
  const now = Date.now();
  const entries = (data ?? []).map(toEntry);
  const expired = entries.filter((e) => Date.parse(e.expiresAt) <= now);
  if (expired.length > 0) void removeForever(expired).catch(() => {});
  return entries.filter((e) => Date.parse(e.expiresAt) > now);
}

/** 휴지통 항목 수 (설정 칸에 보여주려고). 못 받으면 0 */
export async function countTrash(spaceId: string): Promise<number> {
  const since = dayjs().subtract(TRASH_HOURS, 'hour').toISOString();
  const { count, error } = await supabase
    .from('trashed_items')
    .select('id', { count: 'exact', head: true })
    .eq('space_id', spaceId)
    .gt('deleted_at', since);
  if (error) return 0;
  return count ?? 0;
}

/** 서버 휴지통으로 옮긴다 (항목·평가·댓글·반응은 서버가 같이 보관하고 지운다) */
export async function trashItems(ids: string[]) {
  if (ids.length === 0) return;
  const { error } = await supabase.rpc('trash_items', { p_ids: ids });
  if (error) throw error;
}

/** 되살리기. 실시간으로 목록에 다시 들어온다 */
export async function restoreTrashed(id: string) {
  const { error } = await supabase.rpc('restore_trashed_item', { p_id: id });
  if (error) throw error;
}

/** 영영 지우기: 사진 파일을 정리 대기열에 넣고 휴지통에서 뺀다 */
export async function removeForever(entries: TrashEntry[]) {
  if (entries.length === 0) return;
  const { error } = await supabase
    .from('trashed_items')
    .delete()
    .in(
      'id',
      entries.map((e) => e.id)
    );
  if (error) throw error;
  useOutboxStore
    .getState()
    .queuePhotoRemoval(entries.flatMap((e) => photoPaths(e.item)));
}

/** '41시간 뒤 사라져요', '20분 뒤 사라져요' */
export function expiresLabel(expiresAt: string, now = Date.now()) {
  const minutes = Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 60000));
  if (minutes < 60) return `${Math.max(1, minutes)}분 뒤 사라져요`;
  return `${Math.floor(minutes / 60)}시간 뒤 사라져요`;
}
