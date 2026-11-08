import dayjs from 'dayjs';

import { allRecordPhotos, type AuthoredPhoto } from './reviews';
import type { BucketItem } from './types';

/** '지난 이맘때'로 칠 앞뒤 날 수 */
export const MEMORY_NEAR_DAYS = 3;

export type Memory = {
  item: BucketItem;
  /** 몇 년 전 오늘인지. null이면 오늘 날짜는 아니고 앞뒤 며칠 안 ('지난 이맘때') */
  yearsAgo: number | null;
  photos: AuthoredPhoto[];
};

/**
 * 오늘 띄울 추억 하나. 지난해 이전 기록 중에서
 * 몇 년 전 오늘 → 앞뒤 MEMORY_NEAR_DAYS일 안 순으로 찾고,
 * 같은 쪽 안에서는 사진 있는 것 → 별점 높은 것 → 최근 것.
 * 같은 날에는 늘 같은 추억이 나온다. 없으면 null
 * @param today YYYY-MM-DD
 */
export function pickMemory(items: BucketItem[], today: string): Memory | null {
  const now = dayjs(today);
  const candidates: (Memory & { rank: number })[] = [];
  for (const item of items) {
    const date = item.done?.date;
    if (!date) continue;
    const day = dayjs(date);
    if (!day.isValid() || day.year() >= now.year()) continue;
    const exact = day.format('MM-DD') === now.format('MM-DD');
    if (!exact && nearDays(day, now) > MEMORY_NEAR_DAYS) continue;
    const photos = allRecordPhotos(item).filter((p) => p.uri || p.path);
    candidates.push({
      item,
      yearsAgo: exact ? now.year() - day.year() : null,
      photos,
      rank: exact ? 0 : 1,
    });
  }
  candidates.sort(
    (a, b) =>
      a.rank - b.rank ||
      Number(b.photos.length > 0) - Number(a.photos.length > 0) ||
      (b.item.done!.rating ?? 0) - (a.item.done!.rating ?? 0) ||
      b.item.done!.date.localeCompare(a.item.done!.date) ||
      a.item.id.localeCompare(b.item.id)
  );
  const best = candidates[0];
  if (!best) return null;
  return { item: best.item, yearsAgo: best.yearsAgo, photos: best.photos };
}

/** 해를 빼고 본 두 날짜 사이의 날 수 (연말·연초를 넘어가도) */
function nearDays(day: dayjs.Dayjs, now: dayjs.Dayjs) {
  return Math.min(
    ...[-1, 0, 1].map((shift) =>
      Math.abs(day.year(now.year() + shift).diff(now, 'day'))
    )
  );
}

/** 띠에 보여줄 말: '1년 전 오늘', '지난 이맘때' */
export function memoryLabel(memory: Pick<Memory, 'yearsAgo'>) {
  return memory.yearsAgo ? `${memory.yearsAgo}년 전 오늘` : '지난 이맘때';
}
