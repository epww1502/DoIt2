/**
 * 다가오는 일정: 목표 날짜가 잡힌 (아직 안 한) 항목을 날짜순으로 묶는다.
 * 계산만 해서 테스트할 수 있다.
 */
import dayjs from 'dayjs';

import { goalEnd } from '@/lib/bucket/calendarEvent';
import { isResting, type BucketItem } from '@/lib/bucket/types';

export type UpcomingGroup = {
  key: string;
  label: string;
  items: BucketItem[];
};

export type Upcoming = {
  /** 날짜(기간이면 마지막 날)가 지났는데 아직 안 한 것. 최근에 지난 것부터 */
  overdue: BucketItem[];
  /** 오늘부터 앞으로. 가까운 날부터 */
  groups: UpcomingGroup[];
  /** overdue + groups 안의 항목 수 */
  total: number;
  /** 가장 가까운 일정 (오늘 이후). 없으면 null */
  next: BucketItem | null;
};

/** 목표 날짜가 있고 아직 안 한 항목 (매년 하기로 쉬는 것은 뺀다) */
function hasOpenGoal(item: BucketItem, today: string) {
  return !!item.goal && !item.done && !isResting(item, today);
}

/** 이 항목이 들어갈 묶음: 오늘 / 이번 주(7일 안) / 달마다 */
function groupOf(start: string, today: string): { key: string; label: string } {
  // 기간이 이미 시작했으면 오늘로 본다
  if (start <= today) return { key: 'today', label: '오늘' };
  const now = dayjs(today);
  const day = dayjs(start);
  if (day.diff(now, 'day') <= 7) return { key: 'week', label: '7일 안' };
  if (day.isSame(now, 'month')) return { key: 'month', label: '이번 달' };
  return {
    key: day.format('YYYY-MM'),
    label: day.isSame(now, 'year')
      ? day.format('M월')
      : day.format('YYYY년 M월'),
  };
}

export function buildUpcoming(items: BucketItem[], today: string): Upcoming {
  const open = items.filter((it) => hasOpenGoal(it, today));
  const overdue = open
    .filter((it) => goalEnd(it.goal!) < today)
    .sort((a, b) => goalEnd(b.goal!).localeCompare(goalEnd(a.goal!)));
  const ahead = open
    .filter((it) => goalEnd(it.goal!) >= today)
    .sort(
      (a, b) =>
        a.goal!.date.localeCompare(b.goal!.date) ||
        a.title.localeCompare(b.title)
    );

  const groups: UpcomingGroup[] = [];
  for (const item of ahead) {
    const { key, label } = groupOf(item.goal!.date, today);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, label, items: [item] });
  }

  return {
    overdue,
    groups,
    total: open.length,
    next: ahead[0] ?? null,
  };
}
