import dayjs from 'dayjs';
import 'dayjs/locale/ko';

dayjs.locale('ko');

export const DATE_FORMAT = 'YYYY-MM-DD';

export function todayKey(): string {
  return dayjs().format(DATE_FORMAT);
}
