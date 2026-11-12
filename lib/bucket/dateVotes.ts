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

/** 연속된 날 묶음 (그 날들에 되는 사람이 같다) */
export type DayRun = {
  from: string;
  to: string;
  /** 며칠인지 */
  length: number;
  users: string[];
};

const nextDay = (day: string) => dayjs(day).add(1, 'day').format('YYYY-MM-DD');
const sameUsers = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

/** 날마다 되는 사람(날짜 순)을, 연속되고 되는 사람이 같은 날끼리 묶는다 */
export function dayRuns(tally: DayTally[]): DayRun[] {
  const runs: DayRun[] = [];
  for (const t of tally) {
    const last = runs[runs.length - 1];
    if (last && nextDay(last.to) === t.day && sameUsers(last.users, t.users)) {
      last.to = t.day;
      last.length += 1;
    } else {
      runs.push({ from: t.day, to: t.day, length: 1, users: t.users });
    }
  }
  return runs;
}

/** 많이 되는 묶음부터 (같으면 긴 기간, 그다음 빠른 날), 최대 limit개 */
export function bestRuns(tally: DayTally[], limit = 3): DayRun[] {
  return dayRuns(tally)
    .sort(
      (a, b) =>
        b.users.length - a.users.length ||
        b.length - a.length ||
        a.from.localeCompare(b.from)
    )
    .slice(0, limit);
}

/** 날짜 목록을 연속된 기간으로: ['11월 20일 (금) ~ 23일 (월)', '11월 27일 (금)'] */
export function rangeLabels(days: string[]): string[] {
  const sorted = [...new Set(days)].sort();
  return dayRuns(sorted.map((day) => ({ day, users: [] }))).map((r) =>
    runLabel(r.from, r.to)
  );
}

/** '11월 20일 (금) ~ 23일 (월)'. 달이 다르면 뒤에도 달, 하루면 그 날만 */
export function runLabel(from: string, to: string) {
  if (from === to) return voteDayLabel(from);
  const end = dayjs(to);
  const sameMonth = dayjs(from).isSame(end, 'month');
  return `${voteDayLabel(from)} ~ ${end.format(sameMonth ? 'D일 (dd)' : 'M월 D일 (dd)')}`;
}
