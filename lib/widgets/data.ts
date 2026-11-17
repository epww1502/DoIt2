/**
 * 홈 화면 위젯에 보여줄 값 만들기 (새 빌드부터, 지금은 아이폰만).
 * 위젯은 앱과 따로 돌아서 앱의 데이터를 직접 읽지 못한다. 앱이 켜져 있을 때 여기서 만든 값을 위젯에 넘겨 둔다
 * (components/sync/WidgetSync.tsx). 날짜가 바뀌어도 맞게 보이도록 며칠 치를 미리 만들어 넘긴다.
 */
import dayjs from 'dayjs';

import { memoryLabel, pickMemory } from '@/lib/bucket/memory';
import { type BucketItem, isResting } from '@/lib/bucket/types';
import { buildUpcoming } from '@/lib/bucket/upcoming';

/** 며칠 치를 미리 만들어 둘지 (앱을 이만큼 안 켜도 위젯 날짜가 맞는다) */
export const WIDGET_DAYS = 14;
/** '다음에 할 것' 위젯에 보여줄 줄 수 */
export const NEXT_COUNT = 4;
/** '오늘 뭐 하지' 위젯에 넘겨 둘 후보 수 */
export const PICK_COUNT = 12;

const TITLE_MAX = 24;
const short = (text: string, max = TITLE_MAX) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

export type MemoryProps = {
  /** '1년 전 오늘' · '지난 이맘때'. 추억이 없으면 빈 글자 */
  label: string;
  title: string;
  /** 별 글자 (예: ★★★★☆) */
  stars: string;
  review: string;
  /** 누르면 열 주소 */
  url: string;
};

export type DdayProps = {
  /** 'D-12' · 'D-DAY'. 다가오는 날이 없으면 빈 글자 */
  dday: string;
  title: string;
  /** '11월 29일 (일)' */
  date: string;
  url: string;
};

export type NextProps = {
  items: { title: string; url: string }[];
  /** 보여준 것 말고 더 있는 수 */
  more: number;
};

export type PickProps = {
  /** 미리 섞어 둔 후보. 위젯의 '다시 뽑기'가 다음 것으로 넘긴다 */
  picks: { title: string; url: string }[];
  index: number;
};

const itemUrl = (id: string) => `doit2://item/${id}`;
const HOME_URL = 'doit2://';

/** 그날의 추억 (1년 전 오늘 → 지난 이맘때). 없으면 빈 값 */
export function memoryProps(items: BucketItem[], today: string): MemoryProps {
  const memory = pickMemory(items, today);
  if (!memory) {
    return { label: '', title: '', stars: '', review: '', url: HOME_URL };
  }
  const rating = Math.max(0, Math.min(5, memory.item.done?.rating ?? 0));
  return {
    label: memoryLabel(memory),
    title: short(memory.item.title),
    stars: '★'.repeat(rating) + '☆'.repeat(5 - rating),
    review: short(memory.item.done?.review ?? '', 40),
    url: itemUrl(memory.item.id),
  };
}

/** 그날 기준 가장 가까운 일정 */
export function ddayProps(items: BucketItem[], today: string): DdayProps {
  const next = buildUpcoming(items, today).next;
  if (!next?.goal) return { dday: '', title: '', date: '', url: HOME_URL };
  const start = next.goal.date;
  const diff = dayjs(start).diff(dayjs(today), 'day');
  return {
    // 기간으로 정한 일정이 이미 시작했으면 오늘로 본다
    dday: diff <= 0 ? 'D-DAY' : `D-${diff}`,
    title: short(next.title),
    date: dayjs(start).format('M월 D일'),
    url: itemUrl(next.id),
  };
}

/** 아직 안 한 것 (매년 하기로 쉬는 것은 빼고, 최근에 담은 것부터) */
function todoItems(items: BucketItem[], today: string) {
  return items
    .filter((it) => !it.done && !isResting(it, today))
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

export function nextProps(items: BucketItem[], today: string): NextProps {
  const todo = todoItems(items, today);
  return {
    items: todo
      .slice(0, NEXT_COUNT)
      .map((it) => ({ title: short(it.title), url: itemUrl(it.id) })),
    more: Math.max(0, todo.length - NEXT_COUNT),
  };
}

/**
 * 뽑기 후보. 위젯은 스스로 무작위로 뽑지 못해서 앱이 미리 섞어서 넘긴다.
 * @param random 0 이상 1 미만의 수를 주는 함수 (테스트에서 바꿔 넣는다)
 */
export function pickProps(
  items: BucketItem[],
  today: string,
  random: () => number = Math.random
): PickProps {
  const pool = todoItems(items, today);
  // 피셔-예이츠 섞기
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return {
    picks: pool
      .slice(0, PICK_COUNT)
      .map((it) => ({ title: short(it.title), url: itemUrl(it.id) })),
    index: 0,
  };
}

/** 오늘부터 며칠 치의 날짜 (YYYY-MM-DD) */
export function widgetDays(today: string, days = WIDGET_DAYS) {
  return Array.from({ length: days }, (_, i) =>
    dayjs(today).add(i, 'day').format('YYYY-MM-DD')
  );
}
