import { allRecordPhotos } from '@/lib/bucket/reviews';
import type { BucketItem, ItemReview } from '@/lib/bucket/types';

const review = (userId: string, createdAt: string, paths: string[]) =>
  ({
    userId,
    rating: 5,
    review: '',
    createdAt,
    updatedAt: createdAt,
    photos: paths.map((path) => ({ uri: null, path })),
  }) as unknown as ItemReview;

function item(coverPath?: string | null): BucketItem {
  return {
    id: 'i',
    kind: 'place',
    title: 'i',
    category: 'etc',
    setting: 'indoor',
    location: '',
    memo: '',
    createdAt: '2026-01-01T00:00:00Z',
    done: {
      date: '2026-11-01',
      rating: 5,
      review: '',
      photoUri: null,
      photoPath: null,
      photos: [],
      coverPath,
    },
    reviews: [
      review('b', '2026-11-02T00:00:00Z', ['b1', 'b2']),
      review('a', '2026-11-01T00:00:00Z', ['a1']),
    ],
  } as BucketItem;
}

describe('공간 기록 대표 사진', () => {
  it('고르지 않았으면 먼저 평가한 사람 사진부터', () => {
    expect(allRecordPhotos(item()).map((p) => p.path)).toEqual([
      'a1',
      'b1',
      'b2',
    ]);
  });

  it('고른 사진이 맨 앞 (나머지 순서는 그대로)', () => {
    expect(allRecordPhotos(item('b2')).map((p) => p.path)).toEqual([
      'b2',
      'a1',
      'b1',
    ]);
  });

  it('고른 사진이 빠졌으면 원래 순서', () => {
    expect(allRecordPhotos(item('gone')).map((p) => p.path)).toEqual([
      'a1',
      'b1',
      'b2',
    ]);
  });
});
