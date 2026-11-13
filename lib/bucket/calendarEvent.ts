/**
 * 정한 날을 폰 캘린더에 넣기: 종일 일정(.ics 파일 / 구글 캘린더 링크)을 만든다.
 * 계산만 해서 테스트할 수 있다.
 */
import dayjs from 'dayjs';

import type { BucketItem, GoalInfo } from '@/lib/bucket/types';

export type CalendarEvent = {
  title: string;
  /** 첫날 YYYY-MM-DD */
  start: string;
  /** 마지막 날 YYYY-MM-DD (하루면 start와 같다) */
  end: string;
  location: string | null;
  notes: string | null;
};

/** 목표의 마지막 날 (기간으로 정했으면 until, 아니면 그 날) */
export function goalEnd(goal: GoalInfo) {
  return goal.until && goal.until > goal.date ? goal.until : goal.date;
}

/** '2026년 11월 17일 (화)' 또는 '2026년 11월 17일 (화) ~ 20일 (금)' */
export function goalLabel(goal: GoalInfo) {
  const start = dayjs(goal.date);
  const label = start.format('YYYY년 M월 D일 (dd)');
  const end = goalEnd(goal);
  if (end === goal.date) return label;
  const last = dayjs(end);
  const fmt = last.isSame(start, 'month')
    ? 'D일 (dd)'
    : last.isSame(start, 'year')
      ? 'M월 D일 (dd)'
      : 'YYYY년 M월 D일 (dd)';
  return `${label} ~ ${last.format(fmt)}`;
}

/** 이 항목의 목표 날짜로 만든 캘린더 일정. 목표가 없으면 null */
export function goalEvent(item: BucketItem): CalendarEvent | null {
  if (!item.goal) return null;
  const location = item.place
    ? [item.place.name, item.place.address].filter(Boolean).join(', ')
    : item.location || null;
  return {
    title: item.title,
    start: item.goal.date,
    end: goalEnd(item.goal),
    location,
    notes: item.memo.trim() || null,
  };
}

const compact = (day: string) => day.replaceAll('-', '');
const nextDay = (day: string) => dayjs(day).add(1, 'day').format('YYYY-MM-DD');

/** .ics 글자에서 특수문자 처리 (RFC 5545) */
function escapeText(text: string) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** 한 줄이 75바이트를 넘으면 접는다 (한글은 3바이트라 글자 단위로 센다) */
function fold(line: string) {
  const out: string[] = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const code = ch.codePointAt(0) ?? 0;
    const size = code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
    if (bytes + size > 73) {
      out.push(current);
      current = ' ';
      bytes = 1;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join('\r\n');
}

/** 종일 일정 하나짜리 .ics 내용 */
export function buildIcs(
  event: CalendarEvent,
  uid: string,
  now: Date = new Date()
) {
  const stamp = `${now.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DoIt2//Bucket list//KO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}@doit2`,
    `DTSTAMP:${stamp}`,
    // 종일 일정은 끝나는 날 다음 날까지 (끝 날짜는 포함하지 않는다)
    `DTSTART;VALUE=DATE:${compact(event.start)}`,
    `DTEND;VALUE=DATE:${compact(nextDay(event.end))}`,
    `SUMMARY:${escapeText(event.title)}`,
    ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
    ...(event.notes ? [`DESCRIPTION:${escapeText(event.notes)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

/** 구글 캘린더 '일정 만들기' 링크 (앱이 있으면 앱으로, 없으면 웹으로 열린다) */
export function googleCalendarUrl(event: CalendarEvent) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${compact(event.start)}/${compact(nextDay(event.end))}`,
  });
  if (event.location) params.set('location', event.location);
  if (event.notes) params.set('details', event.notes);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
