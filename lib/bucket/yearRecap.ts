/**
 * '올해의 우리' 돌아보기에 쓸 숫자·기록 모으기.
 * 해낸 것(내 기준으로 본 기록)만 넘긴다.
 */
import { spendingOf } from './cost';
import {
  getCategory,
  recordPhotos,
  type BucketItem,
  type CategoryKey,
  type RecordPhoto,
} from './types';

export type YearRecap = {
  year: number;
  items: BucketItem[];
  total: number;
  places: number;
  activities: number;
  /** 기록을 남긴 서로 다른 날 수 */
  days: number;
  averageRating: number;
  first: BucketItem;
  last: BucketItem;
  /** 별점이 가장 높았던 것 (같으면 소감이 있는 것, 그다음 최근) */
  best: BucketItem | null;
  /** 가장 많이 간 동네 ('서울 성동구'처럼). 장소가 없으면 null */
  topArea: { name: string; count: number } | null;
  topCategory: { key: CategoryKey; label: string; count: number } | null;
  /** 가장 많이 한 달 (1~12) */
  topMonth: { month: number; count: number } | null;
  /** 쓴 돈을 적은 기록들의 합 (안 적었으면 0) */
  spent: number;
  /** 사진 모아보기 (항목마다 첫 장, 최근 순으로 최대 6장) */
  photos: { item: BucketItem; photo: RecordPhoto }[];
};

/** 주소에서 동네 이름 ('서울 성동구 성수이로 1' → '서울 성동구') */
function areaOf(item: BucketItem): string | null {
  const address = item.place?.address?.trim();
  if (address) {
    const parts = address.split(/\s+/);
    return parts.slice(0, 2).join(' ');
  }
  const location = item.location.trim();
  if (!location) return null;
  return location.split(/\s+/).slice(0, 2).join(' ');
}

function topOf<K>(counts: Map<K, number>): [K, number] | null {
  let best: [K, number] | null = null;
  for (const entry of counts) {
    if (!best || entry[1] > best[1]) best = entry;
  }
  return best;
}

/** 이 해에 해낸 게 없으면 null */
export function buildYearRecap(
  done: BucketItem[],
  year: number
): YearRecap | null {
  const items = done
    .filter((it) => it.done && it.done.date.startsWith(`${year}-`))
    .sort((a, b) => a.done!.date.localeCompare(b.done!.date));
  if (items.length === 0) return null;

  let ratingSum = 0;
  let rated = 0;
  const areas = new Map<string, number>();
  const categories = new Map<CategoryKey, number>();
  const months = new Map<number, number>();
  const dates = new Set<string>();
  for (const it of items) {
    const d = it.done!;
    dates.add(d.date);
    if (d.rating > 0) {
      ratingSum += d.rating;
      rated += 1;
    }
    const area = areaOf(it);
    if (area) areas.set(area, (areas.get(area) ?? 0) + 1);
    categories.set(it.category, (categories.get(it.category) ?? 0) + 1);
    const month = Number(d.date.slice(5, 7));
    months.set(month, (months.get(month) ?? 0) + 1);
  }

  const best =
    [...items]
      .filter((it) => it.done!.rating > 0)
      .sort(
        (a, b) =>
          b.done!.rating - a.done!.rating ||
          Number(Boolean(b.done!.review)) - Number(Boolean(a.done!.review)) ||
          b.done!.date.localeCompare(a.done!.date)
      )[0] ?? null;

  const area = topOf(areas);
  const category = topOf(categories);
  const month = topOf(months);

  const photos = [...items]
    .reverse()
    .flatMap((item) => {
      const photo = recordPhotos(item.done)[0];
      return photo ? [{ item, photo }] : [];
    })
    .slice(0, 6);

  return {
    year,
    items,
    total: items.length,
    places: items.filter((it) => it.kind === 'place').length,
    activities: items.filter((it) => it.kind === 'activity').length,
    days: dates.size,
    spent: spendingOf(items).total,
    averageRating: rated > 0 ? ratingSum / rated : 0,
    first: items[0],
    last: items[items.length - 1],
    best,
    topArea: area ? { name: area[0], count: area[1] } : null,
    topCategory: category
      ? {
          key: category[0],
          label: getCategory(category[0]).label,
          count: category[1],
        }
      : null,
    topMonth: month ? { month: month[0], count: month[1] } : null,
    photos,
  };
}

/**
 * 돌아볼 해: 1월에는 지난해(지난해 기록이 있으면), 그 밖에는 올해.
 * 볼 기록이 없으면 null
 */
export function recapYear(done: BucketItem[], now: Date): number | null {
  const year = now.getFullYear();
  const has = (y: number) =>
    done.some((it) => it.done?.date.startsWith(`${y}-`));
  if (now.getMonth() === 0 && has(year - 1)) return year - 1;
  return has(year) ? year : null;
}
