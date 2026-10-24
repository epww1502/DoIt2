/**
 * 버킷리스트 공유: 고른 항목의 사본을 서버에 두고 6자리 코드로 나눠준다.
 * 받는 사람은 코드로 미리보기를 보고 원하는 곳에 새 항목으로 담는다.
 */
import type { BucketInput } from '@/lib/bucket/types';

import { supabase } from './client';
import type { Json } from './database.types';

export const SHARE_CODE_LENGTH = 6;

/** 공유 메시지에서 코드를 찾는다 ("공유 코드: K7QM3X") */
export function findShareCode(text: string) {
  const m = text.match(/공유 코드[:\s]*([A-Z0-9]{6})/i);
  return m ? m[1].toUpperCase() : null;
}

/** 항목들을 공유하고 코드를 받는다 (기록·사진은 넘기지 않는다) */
export async function createSharedList(title: string, items: BucketInput[]) {
  const { data, error } = await supabase.rpc('create_shared_list', {
    list_title: title,
    list_items: items as unknown as Json,
  });
  if (error || !data) {
    throw new Error(
      error?.message.includes('too_many_shares')
        ? '오늘은 공유를 너무 많이 만들었어요. 내일 다시 해주세요.'
        : '공유하지 못했어요. 잠시 후 다시 시도해주세요.'
    );
  }
  return data;
}

export type SharedList = {
  title: string;
  items: BucketInput[];
  /** 보낸 사람 닉네임 (없을 수 있다) */
  sender: string | null;
  createdAt: string;
};

/** 코드로 공유받은 목록 (없거나 30일이 지났으면 null) */
export async function getSharedList(code: string): Promise<SharedList | null> {
  const { data, error } = await supabase.rpc('get_shared_list', {
    share_code: code,
  });
  if (error) throw new Error('불러오지 못했어요. 잠시 후 다시 시도해주세요.');
  const row = data?.[0];
  if (!row) return null;
  const items = (row.items as unknown as Partial<BucketInput>[])
    .filter((it) => it.title)
    .map((it): BucketInput => ({
      kind: it.kind === 'activity' ? 'activity' : 'place',
      title: it.title!,
      category: it.category ?? 'etc',
      setting: it.setting === 'outdoor' ? 'outdoor' : 'indoor',
      location: it.location ?? '',
      place: it.place ?? null,
      memo: it.memo ?? '',
    }));
  return {
    title: row.title,
    items,
    sender: row.sender,
    createdAt: row.created_at,
  };
}
