import type { BucketItem } from '@/lib/bucket/types';
import { buildUpcoming } from '@/lib/bucket/upcoming';

const TODAY = '2026-11-13';

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
const goal = (date: string, until?: string) => ({
  goal: { date, until: until ?? null, remind: [] },
});

describe('buildUpcoming', () => {
  it('가까운 날부터 오늘·7일 안·이번 달·달마다 묶는다', () => {
    const up = buildUpcoming(
      [
        item('nextYear', goal('2027-01-05')),
        item('dec', goal('2026-12-24')),
        item('month', goal('2026-11-28')),
        item('week', goal('2026-11-20')),
        item('today', goal('2026-11-13')),
        item('none'),
      ],
      TODAY
    );
    expect(up.groups.map((g) => [g.label, g.items.map((i) => i.id)])).toEqual([
      ['오늘', ['today']],
      ['7일 안', ['week']],
      ['이번 달', ['month']],
      ['12월', ['dec']],
      ['2027년 1월', ['nextYear']],
    ]);
    expect(up.total).toBe(5);
    expect(up.next?.id).toBe('today');
    expect(up.overdue).toEqual([]);
  });

  it('지난 것은 따로, 최근에 지난 것부터', () => {
    const up = buildUpcoming(
      [
        item('old', goal('2026-10-01')),
        item('yesterday', goal('2026-11-12')),
        item('soon', goal('2026-11-14')),
      ],
      TODAY
    );
    expect(up.overdue.map((i) => i.id)).toEqual(['yesterday', 'old']);
    expect(up.next?.id).toBe('soon');
  });

  it('기간이 진행 중이면 지난 것이 아니라 오늘로 본다', () => {
    const up = buildUpcoming(
      [item('trip', goal('2026-11-11', '2026-11-15'))],
      TODAY
    );
    expect(up.overdue).toEqual([]);
    expect(up.groups[0].label).toBe('오늘');
  });

  it('이미 한 것과 쉬는 것은 뺀다', () => {
    const up = buildUpcoming(
      [
        item('done', {
          ...goal('2026-11-20'),
          done: { date: '2026-11-01' } as BucketItem['done'],
        }),
        item('rest', {
          ...goal('2026-11-20'),
          repeat: { every: 'year', restUntil: '2027-10-01' },
        }),
      ],
      TODAY
    );
    expect(up.total).toBe(0);
    expect(up.next).toBeNull();
  });
});
