import {
  allRecordPhotos,
  sharedRecordPhotos,
  viewForMe,
} from '@/lib/bucket/reviews';
import {
  recordPhotos,
  withRecordPhotos,
  type BucketItem,
  type ItemReview,
} from '@/lib/bucket/types';

const ME = 'me';
const OTHER = 'minji';

const p = (path: string) => ({ uri: null, path });

function review(
  userId: string,
  createdAt: string,
  paths: string[]
): ItemReview {
  return {
    userId,
    rating: 5,
    review: '',
    updatedAt: '2026-11-08T00:00:00Z',
    createdAt,
    photos: paths.map(p),
  };
}

function item(sharedPaths: string[], reviews: ItemReview[]): BucketItem {
  return {
    id: 'item-1',
    kind: 'place',
    title: '이케아 구경',
    category: 'etc',
    setting: 'indoor',
    location: '',
    memo: '',
    createdAt: '2026-10-01T00:00:00Z',
    done: withRecordPhotos(
      { date: '2026-11-01', rating: 5, review: '', photoUri: null },
      sharedPaths.map(p)
    ),
    reviews,
  };
}

describe('allRecordPhotos', () => {
  it('함께 붙은 사진 → 먼저 평가한 사람 순으로 모으고 올린 사람을 붙인다', () => {
    const it = item(
      ['s/old.jpg'],
      [
        review(OTHER, '2026-11-02T00:00:00Z', ['s/b1.jpg']),
        review(ME, '2026-11-01T00:00:00Z', ['s/a1.jpg', 's/a2.jpg']),
      ]
    );
    expect(allRecordPhotos(it).map((x) => [x.path, x.by])).toEqual([
      ['s/old.jpg', null],
      ['s/a1.jpg', ME],
      ['s/a2.jpg', ME],
      ['s/b1.jpg', OTHER],
    ]);
  });

  it('예전 앱이 기록에 다시 올려 둔 사진은 한 번만 (평가 쪽으로)', () => {
    const it = item(
      ['s/a1.jpg', 's/old.jpg'],
      [review(ME, '2026-11-01T00:00:00Z', ['s/a1.jpg'])]
    );
    expect(sharedRecordPhotos(it).map((x) => x.path)).toEqual(['s/old.jpg']);
    expect(allRecordPhotos(it).map((x) => x.path)).toEqual([
      's/old.jpg',
      's/a1.jpg',
    ]);
  });
});

describe('viewForMe', () => {
  it('공간이면 모두의 사진을 기록 사진으로 보여준다 (첫 장이 대표)', () => {
    const it = item(
      [],
      [
        review(ME, '2026-11-01T00:00:00Z', ['s/a1.jpg']),
        review(OTHER, '2026-11-02T00:00:00Z', ['s/b1.jpg']),
      ]
    );
    const view = viewForMe(it, { userId: ME, inSpace: true });
    expect(recordPhotos(view.done).map((x) => x.path)).toEqual([
      's/a1.jpg',
      's/b1.jpg',
    ]);
    expect(view.done?.photoPath).toBe('s/a1.jpg');
  });

  it("'나만 보기'는 기록 사진 그대로", () => {
    const it = item(['s/old.jpg'], []);
    const view = viewForMe(it, { userId: ME, inSpace: false });
    expect(recordPhotos(view.done).map((x) => x.path)).toEqual(['s/old.jpg']);
  });
});
