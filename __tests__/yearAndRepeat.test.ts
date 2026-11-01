import { matchesExtras, sortItems } from '@/lib/bucket/search';
import { isResting, nextRestUntil, type BucketItem } from '@/lib/bucket/types';
import { buildYearRecap, recapYear } from '@/lib/bucket/yearRecap';

function item(partial: Partial<BucketItem>): BucketItem {
  return {
    id: Math.random().toString(36).slice(2),
    kind: 'place',
    title: '항목',
    category: 'food',
    setting: 'indoor',
    location: '',
    memo: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    done: null,
    ...partial,
  };
}

const done = (date: string, rating = 0, review = '') => ({
  date,
  rating,
  review,
  photoUri: null,
});

describe('매년 하기', () => {
  it('한 날로부터 1년 뒤의 한 달 전에 다시 올라온다', () => {
    expect(nextRestUntil('2026-04-05', '2026-04-05')).toBe('2027-03-06');
  });

  it('적어도 내일부터 다시 올라온다', () => {
    expect(nextRestUntil('2025-01-10', '2026-11-01')).toBe('2026-11-02');
  });

  it('쉬는 날이 지나면 다시 보인다', () => {
    const it1 = item({ repeat: { every: 'year', restUntil: '2027-03-06' } });
    expect(isResting(it1, '2026-11-01')).toBe(true);
    expect(isResting(it1, '2027-03-06')).toBe(false);
    expect(isResting(item({ repeat: { every: 'year' } }), '2026-11-01')).toBe(
      false
    );
  });
});

describe('목록 골라보기·정렬', () => {
  it('할 것 남은 것만, 실내만', () => {
    const a = item({
      todos: [{ id: '1', text: 'a', done: false }],
      setting: 'indoor',
    });
    const b = item({ todos: [{ id: '1', text: 'a', done: true }] });
    const c = item({ setting: 'outdoor' });
    expect(matchesExtras(a, ['todosLeft'], null)).toBe(true);
    expect(matchesExtras(b, ['todosLeft'], null)).toBe(false);
    expect(matchesExtras(c, ['indoor'], null)).toBe(false);
    // 실내·실외를 둘 다 고르면 둘 다 보인다
    expect(matchesExtras(c, ['indoor', 'outdoor'], null)).toBe(true);
  });

  it('내가 담은 것', () => {
    expect(matchesExtras(item({ createdBy: 'me' }), ['mine'], 'me')).toBe(true);
    expect(matchesExtras(item({ createdBy: 'you' }), ['mine'], 'me')).toBe(
      false
    );
  });

  it('할 것 많이 해둔 순', () => {
    const half = item({
      title: 'half',
      todos: [
        { id: '1', text: 'a', done: true },
        { id: '2', text: 'b', done: false },
      ],
    });
    const all = item({
      title: 'all',
      todos: [{ id: '1', text: 'a', done: true }],
    });
    const none = item({ title: 'none' });
    expect(
      sortItems([none, half, all], 'progress').map((it) => it.title)
    ).toEqual(['all', 'half', 'none']);
  });
});

describe('올해의 우리', () => {
  const items = [
    item({
      title: '첫',
      done: done('2026-02-01', 3),
      place: {
        kakaoId: null,
        name: 'a',
        category: '',
        address: '서울 성동구 성수이로 1',
        latitude: 0,
        longitude: 0,
      },
    }),
    item({
      title: '최고',
      kind: 'activity',
      category: 'cook',
      done: done('2026-05-03', 5, '좋았어'),
      location: '서울 성동구',
    }),
    item({ title: '마지막', done: done('2026-05-20', 4) }),
    item({ title: '작년', done: done('2025-12-31', 5) }),
  ];

  it('그해 기록만 모은다', () => {
    const recap = buildYearRecap(items, 2026)!;
    expect(recap.total).toBe(3);
    expect(recap.first.title).toBe('첫');
    expect(recap.last.title).toBe('마지막');
    expect(recap.best?.title).toBe('최고');
    expect(recap.topArea).toEqual({ name: '서울 성동구', count: 2 });
    expect(recap.topMonth).toEqual({ month: 5, count: 2 });
    expect(recap.activities).toBe(1);
    expect(recap.averageRating).toBe(4);
  });

  it('1월엔 지난해를 돌아본다', () => {
    expect(recapYear(items, new Date(2027, 0, 10))).toBe(2026);
    expect(recapYear(items, new Date(2026, 10, 1))).toBe(2026);
    expect(buildYearRecap(items, 2024)).toBeNull();
  });
});
