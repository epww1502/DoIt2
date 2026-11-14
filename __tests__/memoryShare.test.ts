import {
  buildMemoryPayload,
  isMemoryExpired,
  MAX_SHARE_PHOTOS,
  memoryLink,
  memoryTitle,
} from '@/lib/bucket/memoryShare';
import type { BucketItem } from '@/lib/bucket/types';
import { buildYearRecap } from '@/lib/bucket/yearRecap';

function item(
  title: string,
  date: string,
  rating: number,
  review = '',
  extra: Partial<BucketItem> = {}
): BucketItem {
  return {
    id: title,
    kind: 'place',
    title,
    category: 'food',
    setting: 'indoor',
    location: '',
    place: null,
    memo: '비밀 메모',
    createdAt: `${date}T00:00:00Z`,
    done: { date, rating, review, photoUri: null, cost: 30000 },
    ...extra,
  } as BucketItem;
}

const items = [
  item('파스타', '2026-10-18', 5, '최고였음'),
  item('피크닉', '2026-10-11', 5),
  item('일출', '2026-08-30', 4, '추웠다', { kind: 'activity' }),
  item('작년 것', '2025-03-01', 5),
];
const recap = buildYearRecap(items, 2026)!;
const base = {
  space: '우리 둘',
  emoji: '✨',
  together: true,
  withReviews: true,
  photoItems: [],
};

describe('buildMemoryPayload', () => {
  it('숫자와 달마다 해낸 수', () => {
    const p = buildMemoryPayload(recap, base);
    expect(p.total).toBe(3);
    expect(p.places).toBe(2);
    expect(p.activities).toBe(1);
    expect(p.rating).toBe(4.7);
    expect(p.months[9]).toBe(2);
    expect(p.months[7]).toBe(1);
    expect(p.months.reduce((a, b) => a + b, 0)).toBe(3);
  });

  it('별점 높은 순, 같으면 후기가 있는 것 먼저', () => {
    const p = buildMemoryPayload(recap, base);
    expect(p.best.map((b) => b.title)).toEqual(['파스타', '피크닉', '일출']);
    expect(p.best[0]).toMatchObject({ emoji: '🍝', review: '최고였음' });
  });

  it('후기를 빼면 글은 비운다', () => {
    const p = buildMemoryPayload(recap, { ...base, withReviews: false });
    expect(p.best.every((b) => b.review === '')).toBe(true);
  });

  it('메모·쓴 돈은 어디에도 넣지 않는다', () => {
    const text = JSON.stringify(buildMemoryPayload(recap, base));
    expect(text).not.toContain('비밀 메모');
    expect(text).not.toContain('30000');
  });

  it('사진은 고른 순서대로 번호를 매기고 12장까지', () => {
    const many = Array.from({ length: 15 }, () => items[0]);
    const p = buildMemoryPayload(recap, { ...base, photoItems: many });
    expect(p.photos).toHaveLength(MAX_SHARE_PHOTOS);
    expect(p.photos[0]).toEqual({
      file: '0.jpg',
      title: '파스타',
      date: '2026-10-18',
    });
    expect(p.photos[11].file).toBe('11.jpg');
  });
});

describe('링크와 제목', () => {
  it('제목', () => {
    expect(memoryTitle('우리 둘', 2026)).toBe('우리 둘의 2026년');
    expect(memoryTitle('', 2026)).toBe('나의 2026년');
  });

  it('기간이 지났는지', () => {
    const now = new Date('2026-12-14T00:00:00Z');
    expect(isMemoryExpired('2026-12-13T23:59:59Z', now)).toBe(true);
    expect(isMemoryExpired('2026-12-14T00:00:01Z', now)).toBe(false);
  });

  it('링크', () => {
    expect(memoryLink('abc')).toBe(
      'https://doit2app.github.io/memories.html?t=abc'
    );
  });
});
