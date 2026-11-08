/**
 * 버킷리스트 검색과 정렬.
 */
import { getCategory, itemTodos, type BucketItem } from './types';

export type BucketSort =
  'recent' | 'oldest' | 'goal' | 'progress' | 'name' | 'wanted';

export const BUCKET_SORT_META: Record<
  BucketSort,
  { label: string; spaceOnly?: boolean }
> = {
  recent: { label: '최근에 담은 순' },
  oldest: { label: '오래된 순' },
  goal: { label: '목표 날짜 가까운 순' },
  progress: { label: '할 것 많이 해둔 순' },
  name: { label: '이름 순' },
  wanted: { label: '하고 싶은 사람 많은 순', spaceOnly: true },
};

/** 목록에서 더 골라보기 (여러 개 고르면 모두 맞는 것만. 실내·실외는 둘 중 하나) */
export type BucketExtra =
  'todosLeft' | 'goal' | 'place' | 'indoor' | 'outdoor' | 'mine';

export const BUCKET_EXTRA_META: Record<
  BucketExtra,
  { label: string; spaceOnly?: boolean }
> = {
  todosLeft: { label: '할 것 남은 것' },
  goal: { label: '목표 날짜 있는 것' },
  place: { label: '장소 있는 것' },
  indoor: { label: '실내' },
  outdoor: { label: '실외' },
  mine: { label: '내가 담은 것', spaceOnly: true },
};

/** 할 것 진행률 (0~1). 할 것이 없으면 null */
export function todoProgress(item: BucketItem) {
  const todos = itemTodos(item);
  if (todos.length === 0) return null;
  return todos.filter((t) => t.done).length / todos.length;
}

export function matchesExtras(
  item: BucketItem,
  extras: BucketExtra[],
  userId: string | null
) {
  if (extras.length === 0) return true;
  const on = new Set(extras);
  if (on.has('todosLeft') && !itemTodos(item).some((t) => !t.done)) {
    return false;
  }
  if (on.has('goal') && !item.goal?.date) return false;
  if (on.has('place') && !item.place && !item.location.trim()) return false;
  if (on.has('indoor') !== on.has('outdoor')) {
    if (item.setting !== (on.has('indoor') ? 'indoor' : 'outdoor')) {
      return false;
    }
  }
  if (on.has('mine') && (!userId || item.createdBy !== userId)) return false;
  return true;
}

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

/**
 * @param wantCount 'wanted' 정렬: 항목마다 하고 싶다고 한 사람 수 (없으면 최근에 담은 순)
 */
export function sortItems(
  items: BucketItem[],
  sort: BucketSort,
  wantCount?: (itemId: string) => number
) {
  const list = [...items];
  switch (sort) {
    case 'wanted':
      // 많이 받은 것 먼저, 같으면 최근에 담은 순
      return list.sort(
        (a, b) =>
          (wantCount?.(b.id) ?? 0) - (wantCount?.(a.id) ?? 0) ||
          Date.parse(b.createdAt) - Date.parse(a.createdAt)
      );
    case 'oldest':
      return list.sort(
        (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)
      );
    case 'progress':
      // 할 것을 많이 해둔 것 먼저, 할 것이 없는 것은 최근에 담은 순으로 뒤에
      return list.sort((a, b) => {
        const pa = todoProgress(a);
        const pb = todoProgress(b);
        if (pa !== null && pb !== null && pa !== pb) return pb - pa;
        if (pa !== null && pb === null) return -1;
        if (pb !== null && pa === null) return 1;
        return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      });
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
