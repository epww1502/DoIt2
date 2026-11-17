/**
 * 정한 날을 폰 캘린더에 넣기.
 * - 폰 캘린더에 바로: 폰의 '일정 추가' 화면을 채워서 연다 (새 빌드부터. 저장은 사용자가 누른다)
 * - 구글 캘린더: '일정 만들기' 링크를 연다 (앱이 있으면 앱, 없으면 웹)
 * - 다른 캘린더 앱: .ics 파일을 만들어 공유 시트로 넘긴다 (삼성·애플 캘린더 등이 받는다)
 */
import { Directory, File, Paths } from 'expo-file-system';
import { requireOptionalNativeModule } from 'expo';
import { Linking } from 'react-native';

import {
  buildIcs,
  googleCalendarUrl,
  type CalendarEvent,
} from '@/lib/bucket/calendarEvent';

export async function openGoogleCalendar(event: CalendarEvent) {
  await Linking.openURL(googleCalendarUrl(event));
}

/** .ics 파일을 만들어 공유 시트를 연다 */
export async function shareIcs(event: CalendarEvent, uid: string) {
  const folder = new Directory(Paths.cache, 'calendar');
  if (!folder.exists) folder.create({ intermediates: true });
  const file = new File(folder, `doit2-${uid}.ics`);
  if (file.exists) file.delete();
  file.create();
  await file.write(buildIcs(event, uid));
  const Sharing = await import('expo-sharing');
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/calendar',
    UTI: 'public.calendar-event',
    dialogTitle: '캘린더에 넣기',
  });
}

/** 폰의 '일정 추가' 화면을 바로 열 수 있는지 (캘린더 모듈이 든 새 빌드인지) */
export function canAddToDeviceCalendar() {
  return requireOptionalNativeModule('ExpoCalendar') !== null;
}

/** 'YYYY-MM-DD'를 이 폰 시간대의 그날 0시로 */
function localDay(day: string, endOfDay = false) {
  const [y, m, d] = day.split('-').map(Number);
  return endOfDay
    ? new Date(y, m - 1, d, 23, 59, 0)
    : new Date(y, m - 1, d, 0, 0, 0);
}

/**
 * 폰의 '일정 추가' 화면을 종일 일정으로 채워서 연다. 저장할지는 그 화면에서 사용자가 정한다.
 * 캘린더 권한을 묻지 않는다 (폰이 띄우는 화면이라 앱이 캘린더를 읽지 않는다).
 */
export async function addToDeviceCalendar(event: CalendarEvent) {
  // 예전 빌드에서 바로 불러오면 앱이 멈추니, 쓸 때만 불러온다
  const Calendar = await import('expo-calendar/legacy');
  await Calendar.createEventInCalendarAsync({
    title: event.title,
    startDate: localDay(event.start),
    endDate: localDay(event.end, true),
    allDay: true,
    location: event.location ?? undefined,
    notes: event.notes ?? undefined,
  });
}
