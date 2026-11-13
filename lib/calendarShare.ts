/**
 * 정한 날을 폰 캘린더에 넣기.
 * - 구글 캘린더: '일정 만들기' 링크를 연다 (앱이 있으면 앱, 없으면 웹)
 * - 다른 캘린더 앱: .ics 파일을 만들어 공유 시트로 넘긴다 (삼성·애플 캘린더 등이 받는다)
 */
import { Directory, File, Paths } from 'expo-file-system';
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
