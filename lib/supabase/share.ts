/**
 * 버킷리스트 공유: 고른 항목의 사본을 서버에 두고 6자리 코드로 나눠준다.
 * 받는 사람은 코드로 미리보기를 보고 원하는 곳에 새 항목으로 담는다.
 */
import { normalizeUrl } from '@/lib/bucket/link';
import {
  itemTodos,
  MAX_LINKS,
  newTodoId,
  type BucketInput,
  type ItemLink,
} from '@/lib/bucket/types';

import { supabase } from './client';
import type { Json } from './database.types';

/** 공유받은 목록의 링크 (다른 사람이 만든 것이라 모양을 다시 확인한다) */
function sharedLinks(value: unknown): ItemLink[] {
  if (!Array.isArray(value)) return [];
  const links: ItemLink[] = [];
  for (const raw of value as Partial<ItemLink>[]) {
    const url = typeof raw?.url === 'string' ? normalizeUrl(raw.url) : null;
    if (!url || links.some((l) => l.url === url)) continue;
    const text = (v: unknown, max: number) =>
      typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;
    const image = text(raw.image, 1000);
    links.push({
      url,
      title: text(raw.title, 120),
      image: image?.startsWith('https://') ? image : null,
      site: text(raw.site, 40),
    });
    if (links.length >= MAX_LINKS) break;
  }
  return links;
}

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
      links: sharedLinks(it.links),
      // 할 것은 새로 시작하니 체크를 풀고, id는 새로 만든다 (같은 목록을 두 번 가져와도 겹치지 않게)
      todos: itemTodos({ todos: Array.isArray(it.todos) ? it.todos : [] })
        .slice(0, 30)
        .map((t) => ({
          id: newTodoId(),
          text: String(t.text).slice(0, 60),
          done: false,
          place: t.place ?? null,
        })),
    }));
  return {
    title: row.title,
    items,
    sender: row.sender,
    createdAt: row.created_at,
  };
}
