/** 같이 갈 날 맞추기: 표를 날마다 모아 많이 되는 날부터 */
import dayjs from 'dayjs';

import '@/lib/date';

export type VoteLike = { day: string; user_id: string };

export type DayTally = {
  /** YYYY-MM-DD */
  day: string;
  /** 그 날 되는 사람 (먼저 고른 순) */
  users: string[];
};

/** 오늘부터의 날만, 날마다 되는 사람 (날짜 순) */
export function tallyDays(votes: VoteLike[], today: string): DayTally[] {
  const byDay = new Map<string, string[]>();
  for (const v of votes) {
    if (v.day < today) continue;
    const users = byDay.get(v.day) ?? [];
    if (!users.includes(v.user_id)) users.push(v.user_id);
    byDay.set(v.day, users);
  }
  return [...byDay.entries()]
    .map(([day, users]) => ({ day, users }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

/** 많이 되는 날부터 (같으면 빠른 날), 최대 limit개 */
export function bestDays(tally: DayTally[], limit = 3): DayTally[] {
  return [...tally]
    .sort(
      (a, b) => b.users.length - a.users.length || a.day.localeCompare(b.day)
    )
    .slice(0, limit);
}

/** 고른 사람 수 (중복 없이) */
export function voterCount(votes: VoteLike[], today: string) {
  return new Set(votes.filter((v) => v.day >= today).map((v) => v.user_id))
    .size;
}

/** '11월 16일 (토)' */
export function voteDayLabel(day: string) {
  return dayjs(day).format('M월 D일 (dd)');
}

/** 두 날 사이의 모든 날 (순서 상관없이, 둘 다 포함). 오늘 전 날은 뺀다. 끌어서 기간을 고를 때 */
export function daysBetween(a: string, b: string, today: string): string[] {
  const [from, to] = a <= b ? [a, b] : [b, a];
  const days: string[] = [];
  for (let d = dayjs(from); !d.isAfter(to, 'day'); d = d.add(1, 'day')) {
    const key = d.format('YYYY-MM-DD');
    if (key >= today) days.push(key);
  }
  return days;
}
