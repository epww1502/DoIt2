import dayjs from 'dayjs';

import type { BucketItem } from '@/lib/bucket/types';
import { planReminders, type ReminderSource } from '@/lib/reminderPlan';

// 2026-10-25(일) 정오 기준
const NOW = dayjs('2026-10-25T12:00:00').valueOf();

function item(id: string, overrides: Partial<BucketItem> = {}): BucketItem {
  return {
    id,
    kind: 'place',
    title: `항목 ${id}`,
    category: 'activity',
    setting: 'outdoor',
    location: '',
    place: null,
    memo: '',
    createdAt: '2026-10-01T00:00:00Z',
    done: null,
    ...overrides,
  };
}

function source(items: BucketItem[]): ReminderSource {
  return { spaceId: 'space-1', title: '✨ 우리의 버킷리스트', items };
}

describe('목표 날짜 알림', () => {
  it('고른 시점마다 정해진 시각에 건다', () => {
    const plan = planReminders(
      [
        source([
          item('a', {
            goal: { date: '2026-11-10', remind: ['week', 'day', 'morning'] },
          }),
        ]),
      ],
      { weekend: false, now: NOW }
    );
    expect(plan.map((p) => [p.id, dayjs(p.at).format('MM-DD HH:mm')])).toEqual([
      ['goal:a:week', '11-03 10:00'],
      ['goal:a:day', '11-09 20:00'],
      ['goal:a:morning', '11-10 09:00'],
      ['goal:a:after', '11-11 20:00'],
    ]);
    expect(plan[1].body).toContain('내일이');
    expect(plan[3].body).toContain('기록');
  });

  it('기간으로 정했으면 마지막 날 다음 날 기록 알림', () => {
    const plan = planReminders(
      [
        source([
          item('a', {
            goal: { date: '2026-11-17', until: '2026-11-20', remind: ['day'] },
          }),
        ]),
      ],
      { weekend: false, now: NOW }
    );
    expect(plan.map((p) => [p.id, dayjs(p.at).format('MM-DD HH:mm')])).toEqual([
      ['goal:a:day', '11-16 20:00'],
      ['goal:a:after', '11-21 20:00'],
    ]);
  });

  it('이미 지난 시각, 해낸 항목, 알림을 끈 항목은 걸지 않는다', () => {
    const plan = planReminders(
      [
        source([
          // 일주일 전(10-20)은 지났고 당일(10-27)만 남는다
          item('past', {
            goal: { date: '2026-10-27', remind: ['week', 'morning'] },
          }),
          item('done', {
            goal: { date: '2026-11-10', remind: ['day'] },
            done: { date: '2026-10-24', rating: 5, review: '', photoUri: null },
          }),
          item('silent', { goal: { date: '2026-11-10', remind: [] } }),
        ]),
      ],
      { weekend: false, now: NOW }
    );
    expect(plan.map((p) => p.id)).toEqual([
      'goal:past:morning',
      'goal:past:after',
    ]);
  });
});

describe('주말 추천', () => {
  it('다가오는 금요일 저녁 7시부터 4주를 건다', () => {
    const plan = planReminders([source([item('a'), item('b')])], {
      weekend: true,
      now: NOW,
    });
    expect(plan.map((p) => dayjs(p.at).format('YYYY-MM-DD HH:mm'))).toEqual([
      '2026-10-30 19:00',
      '2026-11-06 19:00',
      '2026-11-13 19:00',
      '2026-11-20 19:00',
    ]);
    expect(plan.every((p) => p.kind === 'weekend')).toBe(true);
  });

  it('같은 금요일에는 다시 계산해도 같은 항목을 추천한다', () => {
    const sources = [source([item('a'), item('b'), item('c')])];
    const first = planReminders(sources, { weekend: true, now: NOW });
    const again = planReminders(sources, {
      weekend: true,
      now: NOW + 3600_000,
    });
    expect(again.map((p) => p.itemId)).toEqual(first.map((p) => p.itemId));
  });

  it('추천할 항목이 없으면 담아보라고 알린다', () => {
    const plan = planReminders([source([])], { weekend: true, now: NOW });
    expect(plan[0].itemId).toBeNull();
    expect(plan[0].body).toContain('담아봐요');
  });

  it('끄면 걸지 않는다', () => {
    const plan = planReminders([source([item('a')])], {
      weekend: false,
      now: NOW,
    });
    expect(plan).toHaveLength(0);
  });
});
