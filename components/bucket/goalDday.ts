import dayjs from 'dayjs';

/** 목표 날짜까지 남은 날: 'D-12', 'D-DAY', 지났으면 'D+3' */
export function goalDday(date: string) {
  const diff = dayjs(date).startOf('day').diff(dayjs().startOf('day'), 'day');
  if (diff === 0) return 'D-DAY';
  return diff > 0 ? `D-${diff}` : `D+${-diff}`;
}

/** 목표 날짜가 지났는지 */
export function goalPassed(date: string) {
  return dayjs(date).endOf('day').isBefore(dayjs());
}
