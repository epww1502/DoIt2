import {
  averageRating,
  itemStatus,
  myRating,
  viewForMe,
  visibleReviews,
} from '@/lib/bucket/reviews';
import type { BucketItem, ItemReview } from '@/lib/bucket/types';

const ME = 'me';
const OTHER = 'minji';

function review(userId: string, rating: number | null, text = ''): ItemReview {
  return { userId, rating, review: text, updatedAt: '2026-10-25T00:00:00Z' };
}

function item(overrides: Partial<BucketItem> = {}): BucketItem {
  return {
    id: 'item-1',
    kind: 'place',
    title: '서울숲 피크닉',
    category: 'activity',
    setting: 'outdoor',
    location: '',
    place: null,
    memo: '',
    createdAt: '2026-10-01T00:00:00Z',
    done: null,
    reviews: [],
    ...overrides,
  };
}

const done = {
  date: '2026-10-11',
  rating: 3,
  review: '예전 한 줄',
  photoUri: null,
};

describe('itemStatus', () => {
  it('아무도 기록 안 했으면 todo', () => {
    expect(itemStatus(item(), { userId: ME, inSpace: true })).toBe('todo');
  });

  it("'나만 보기'는 기록만 있으면 done", () => {
    expect(itemStatus(item({ done }), { userId: ME, inSpace: false })).toBe(
      'done'
    );
  });

  it('공간에서 다른 사람만 평가했으면 awaiting', () => {
    const it = item({ done, reviews: [review(OTHER, 5)] });
    expect(itemStatus(it, { userId: ME, inSpace: true })).toBe('awaiting');
  });

  it('내가 평가했거나 건너뛰었으면 done', () => {
    const rated = item({ done, reviews: [review(ME, 4)] });
    const skipped = item({ done, reviews: [review(ME, null)] });
    expect(itemStatus(rated, { userId: ME, inSpace: true })).toBe('done');
    expect(itemStatus(skipped, { userId: ME, inSpace: true })).toBe('done');
  });
});

describe('별점 계산', () => {
  const ctx = { userId: ME, inSpace: true };

  it('평균은 건너뛴 사람을 빼고 소수 첫째 자리까지', () => {
    const it = item({
      done,
      reviews: [review(ME, 5), review(OTHER, 4), review('x', null)],
    });
    expect(averageRating(it, ctx)).toBe(4.5);
  });

  it('아무도 별점이 없으면 평균은 null', () => {
    const it = item({ done, reviews: [review(ME, null)] });
    expect(averageRating(it, ctx)).toBeNull();
  });

  it("'나만 보기'는 done.rating을 그대로 쓴다", () => {
    expect(myRating(item({ done }), { userId: ME, inSpace: false })).toBe(3);
  });

  it('건너뛴 평가는 목록에 보이지 않는다', () => {
    const it = item({
      done,
      reviews: [review(ME, null), review(OTHER, null, '좋았어')],
    });
    expect(visibleReviews(it).map((r) => r.userId)).toEqual([OTHER]);
  });
});

describe('viewForMe', () => {
  const ctx = { userId: ME, inSpace: true };

  it('내 별점·소감으로 바꿔 보여준다', () => {
    const it = item({
      done,
      reviews: [review(ME, 2, '별로'), review(OTHER, 5)],
    });
    const view = viewForMe(it, ctx);
    expect(view.done?.rating).toBe(2);
    expect(view.done?.review).toBe('별로');
  });

  it('내 별점이 없으면 모두의 평균(반올림), 소감은 비운다', () => {
    const it = item({ done, reviews: [review(OTHER, 5), review('x', 4)] });
    const view = viewForMe(it, ctx);
    expect(view.done?.rating).toBe(5);
    expect(view.done?.review).toBe('');
  });

  it("'나만 보기'는 그대로", () => {
    const it = item({ done });
    expect(viewForMe(it, { userId: ME, inSpace: false })).toBe(it);
  });
});
