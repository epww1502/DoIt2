import { memoryLabel, pickMemory } from '@/lib/bucket/memory';
import type { BucketItem } from '@/lib/bucket/types';

function done(
  id: string,
  date: string,
  { rating = 4, photo = false }: { rating?: number; photo?: boolean } = {}
): BucketItem {
  return {
    id,
    kind: 'place',
    title: id,
    category: 'etc',
    setting: 'indoor',
    location: '',
    memo: '',
    createdAt: '2024-01-01T00:00:00Z',
    done: {
      date,
      rating,
      review: '',
      photoUri: null,
      photoPath: photo ? `s/${id}.jpg` : null,
    },
  } as BucketItem;
}

describe('pickMemory', () => {
  const today = '2026-11-08';

  it('몇 년 전 오늘을 앞뒤 며칠보다 먼저 고른다', () => {
    const m = pickMemory(
      [
        done('near', '2025-11-07', { photo: true, rating: 5 }),
        done('exact', '2024-11-08', { rating: 3 }),
      ],
      today
    );
    expect(m?.item.id).toBe('exact');
    expect(m?.yearsAgo).toBe(2);
    expect(memoryLabel(m!)).toBe('2년 전 오늘');
  });

  it('같은 쪽이면 사진 있는 것 → 별점 높은 것', () => {
    const m = pickMemory(
      [
        done('high', '2025-11-09', { rating: 5 }),
        done('photo', '2025-11-10', { rating: 2, photo: true }),
      ],
      today
    );
    expect(m?.item.id).toBe('photo');
    expect(m?.yearsAgo).toBeNull();
    expect(m?.photos).toHaveLength(1);
    expect(memoryLabel(m!)).toBe('지난 이맘때');
  });

  it('올해 기록, 범위 밖, 기록 안 한 것은 빼고 없으면 null', () => {
    expect(
      pickMemory(
        [
          done('thisYear', '2026-11-08'),
          done('far', '2025-11-20'),
          { ...done('none', '2025-11-08'), done: null },
        ],
        today
      )
    ).toBeNull();
  });

  it('연말·연초를 넘어가도 앞뒤 며칠로 친다', () => {
    const m = pickMemory([done('dec', '2024-12-30')], '2026-01-01');
    expect(m?.item.id).toBe('dec');
  });
});
