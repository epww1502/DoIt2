import {
  buildIcs,
  goalEnd,
  goalLabel,
  googleCalendarUrl,
  type CalendarEvent,
} from '@/lib/bucket/calendarEvent';
import { forecastRange, parseForecast } from '@/lib/forecast';

const event: CalendarEvent = {
  title: '제주, 한라산; 등반',
  start: '2026-11-17',
  end: '2026-11-20',
  location: '한라산',
  notes: '새벽 출발\n도시락',
};

describe('calendarEvent', () => {
  it('goalEnd / goalLabel', () => {
    expect(goalEnd({ date: '2026-11-17', remind: [] })).toBe('2026-11-17');
    expect(
      goalEnd({ date: '2026-11-17', until: '2026-11-20', remind: [] })
    ).toBe('2026-11-20');
    expect(goalLabel({ date: '2026-11-17', remind: [] })).toMatch(
      /^2026년 11월 17일 \([^)]+\)$/
    );
    expect(
      goalLabel({ date: '2026-11-17', until: '2026-11-20', remind: [] })
    ).toMatch(/^2026년 11월 17일 \(.+\) ~ 20일 \(.+\)$/);
    expect(
      goalLabel({ date: '2026-11-30', until: '2026-12-02', remind: [] })
    ).toMatch(/~ 12월 2일/);
  });

  it('buildIcs: 종일 일정, 끝 날짜는 다음 날, 특수문자 처리', () => {
    const ics = buildIcs(event, 'abc', new Date('2026-11-13T01:02:03Z'));
    expect(ics).toContain('DTSTART;VALUE=DATE:20261117\r\n');
    expect(ics).toContain('DTEND;VALUE=DATE:20261121\r\n');
    expect(ics).toContain('DTSTAMP:20261113T010203Z');
    expect(ics).toContain('SUMMARY:제주\\, 한라산\\; 등반');
    expect(ics).toContain('DESCRIPTION:새벽 출발\\n도시락');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('buildIcs: 긴 줄은 75바이트 안으로 접는다', () => {
    const ics = buildIcs({ ...event, title: '가'.repeat(60) }, 'x');
    for (const line of ics.split('\r\n')) {
      expect(unescape(encodeURIComponent(line)).length).toBeLessThanOrEqual(75);
    }
    expect(ics).toContain('\r\n 가');
  });

  it('googleCalendarUrl', () => {
    const url = new URL(googleCalendarUrl(event));
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('dates')).toBe('20261117/20261121');
    expect(url.searchParams.get('text')).toBe(event.title);
    expect(url.searchParams.get('location')).toBe('한라산');
  });
});

describe('forecast', () => {
  it('forecastRange: 예보 범위(16일) 안만', () => {
    const today = '2026-11-13';
    expect(forecastRange('2026-11-17', '2026-11-17', today)).toEqual({
      from: '2026-11-17',
      to: '2026-11-17',
    });
    // 마지막 예보일은 11-28
    expect(forecastRange('2026-11-27', '2026-12-01', today)).toEqual({
      from: '2026-11-27',
      to: '2026-11-28',
    });
    expect(forecastRange('2026-11-29', '2026-11-29', today)).toBeNull();
    // 이미 시작한 기간은 오늘부터
    expect(forecastRange('2026-11-10', '2026-11-14', today)).toEqual({
      from: '2026-11-13',
      to: '2026-11-14',
    });
    expect(forecastRange('2026-11-01', '2026-11-02', today)).toBeNull();
  });

  it('parseForecast', () => {
    expect(
      parseForecast({
        daily: {
          time: ['2026-11-17'],
          weather_code: [61],
          temperature_2m_max: [12.6],
          temperature_2m_min: [3.2],
          precipitation_probability_max: [null],
        },
      })
    ).toEqual([
      {
        date: '2026-11-17',
        emoji: '🌧️',
        label: '비',
        max: 13,
        min: 3,
        rain: null,
      },
    ]);
    expect(parseForecast({})).toEqual([]);
  });
});
