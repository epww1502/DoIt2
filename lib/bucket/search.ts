/**
 * 버킷리스트 검색과 정렬.
 */
import { getCategory, type BucketItem } from './types';

export type BucketSort = 'recent' | 'oldest' | 'goal' | 'name';

export const BUCKET_SORT_META: Record<BucketSort, { label: string }> = {
  recent: { label: '최근에 담은 순' },
  oldest: { label: '오래된 순' },
  goal: { label: '목표 날짜 가까운 순' },
  name: { label: '이름 순' },
};

/** 띄어쓰기·대소문자 상관없이 비교하려고 */
function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, '');
}

/** 검색어가 제목·메모·위치·장소 이름·카테고리 중 하나에 들어 있는지 */
export function matchesQuery(item: BucketItem, query: string) {
  const q = normalize(query);
  if (!q) return true;
  const fields = [
    item.title,
    item.memo,
    item.location,
    item.place?.name ?? '',
    item.place?.address ?? '',
    getCategory(item.category).label,
  ];
  return fields.some((f) => normalize(f).includes(q));
}

export function sortItems(items: BucketItem[], sort: BucketSort) {
  const list = [...items];
  switch (sort) {
    case 'oldest':
      return list.sort(
        (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)
      );
    case 'name':
      return list.sort((a, b) => a.title.localeCompare(b.title, 'ko'));
    case 'goal':
      // 목표 날짜가 있는 것 먼저 (가까운 순), 없는 것은 최근에 담은 순으로 뒤에
      return list.sort((a, b) => {
        const ga = a.goal?.date;
        const gb = b.goal?.date;
        if (ga && gb) return ga.localeCompare(gb);
        if (ga) return -1;
        if (gb) return 1;
        return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      });
    default:
      return list.sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
      );
  }
}
