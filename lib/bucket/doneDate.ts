import dayjs from 'dayjs';

import { dayCount, type DoneRecord } from '@/lib/bucket/types';

/**
 * 기록 날짜 표시. 시작하기로 시작해 하루를 넘긴 기록이면 기간과 일수까지
 * long: '2026년 3월 2일 ~ 3월 15일 · 14일' / short: '2026.3.2 ~ 3.15 · 14일'
 */
export function doneDateLabel(
  done: Pick<DoneRecord, 'date' | 'startDate'>,
  style: 'long' | 'short'
) {
  const end = dayjs(done.date);
  const { startDate } = done;
  if (!startDate || startDate >= done.date) {
    return end.format(style === 'long' ? 'YYYY년 M월 D일 (dd)' : 'YYYY.M.D');
  }
  const start = dayjs(startDate);
  const sameYear = start.year() === end.year();
  const [full, part] =
    style === 'long' ? ['YYYY년 M월 D일', 'M월 D일'] : ['YYYY.M.D', 'M.D'];
  return `${start.format(full)} ~ ${end.format(sameYear ? part : full)} · ${dayCount(startDate, done.date)}일`;
}
