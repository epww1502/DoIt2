/**
 * 사람마다 따로 남기는 별점·소감 계산.
 * - '나만 보기': 지금처럼 done.rating·done.review 하나만 있다
 * - 공간: done은 함께한 기록(날짜·사진), 별점·소감은 reviews에 사람마다
 */
import {
  recordPhotos,
  withRecordPhotos,
  type BucketItem,
  type ItemReview,
  type RecordPhoto,
} from './types';

/** 누구 기준으로 볼지: 내 계정 id와 공간을 보고 있는지 */
export type ReviewCtx = { userId: string | null; inSpace: boolean };

/**
 * 내 기준 항목 상태.
 * - todo: 아직 아무도 기록하지 않았다 (버킷리스트)
 * - awaiting: 다른 사람이 기록했는데 나는 아직 평가하지 않았다 (버킷리스트 맨 위 '평가를 기다려요')
 * - done: 나도 평가했거나 건너뛰었다 (함께한 것)
 */
export type ItemStatus = 'todo' | 'awaiting' | 'done';

export function myReview(
  item: BucketItem,
  userId: string | null
): ItemReview | null {
  if (!userId) return null;
  return item.reviews?.find((r) => r.userId === userId) ?? null;
}

export function itemStatus(item: BucketItem, ctx: ReviewCtx): ItemStatus {
  if (!item.done) return 'todo';
  if (!ctx.inSpace || !ctx.userId) return 'done';
  return myReview(item, ctx.userId) ? 'done' : 'awaiting';
}

/** 별점을 남긴 평가들 (건너뛴 사람은 빠진다) */
export function ratedReviews(item: BucketItem): ItemReview[] {
  return (item.reviews ?? []).filter((r) => r.rating !== null);
}

/** 보여줄 평가들: 별점이나 소감이 있는 것 (건너뛴 사람은 빠진다) */
export function visibleReviews(item: BucketItem): ItemReview[] {
  return (item.reviews ?? []).filter(
    (r) => r.rating !== null || r.review.trim() !== ''
  );
}

/** 누가 올렸는지 붙은 기록 사진. by가 null이면 예전 기록에 함께 붙어 있던 사진 */
export type AuthoredPhoto = RecordPhoto & { by: string | null };

/** 한 사람이 올린 기록 사진 */
export function reviewPhotos(review: ItemReview | null | undefined) {
  return (review?.photos ?? []).filter((p) => p.uri || p.path);
}

/**
 * 공간: 예전처럼 기록(done)에 함께 붙어 있는 사진 (누가 올렸는지 모른다).
 * 사람별 사진으로 옮긴 뒤에도 예전 앱이 다시 올려 둘 수 있어서, 평가에 있는 사진은 뺀다
 */
export function sharedRecordPhotos(item: BucketItem): RecordPhoto[] {
  const owned = new Set<string>();
  for (const r of item.reviews ?? []) {
    for (const p of reviewPhotos(r)) {
      if (p.path) owned.add(p.path);
      if (p.uri) owned.add(p.uri);
    }
  }
  return recordPhotos(item.done).filter(
    (p) => !(p.path && owned.has(p.path)) && !(p.uri && owned.has(p.uri))
  );
}

/**
 * 공간 기록의 모든 사진 (누가 올렸는지와 함께).
 * 함께 붙어 있던 사진 → 먼저 평가한 사람 순. 첫 장이 목록의 대표 사진이 된다
 */
export function allRecordPhotos(item: BucketItem): AuthoredPhoto[] {
  const shared = sharedRecordPhotos(item).map((p) => ({ ...p, by: null }));
  const byPerson = [...(item.reviews ?? [])]
    .sort((a, b) =>
      (a.createdAt ?? a.updatedAt).localeCompare(b.createdAt ?? b.updatedAt)
    )
    .flatMap((r) => reviewPhotos(r).map((p) => ({ ...p, by: r.userId })));
  return [...shared, ...byPerson];
}

/** 내 별점. 건너뛰었거나 아직이면 null */
export function myRating(item: BucketItem, ctx: ReviewCtx): number | null {
  if (!item.done) return null;
  if (!ctx.inSpace) return item.done.rating;
  return myReview(item, ctx.userId)?.rating ?? null;
}

/** 내 소감 */
export function myReviewText(item: BucketItem, ctx: ReviewCtx): string {
  if (!item.done) return '';
  if (!ctx.inSpace) return item.done.review;
  return myReview(item, ctx.userId)?.review ?? '';
}

/** 모두의 평균 별점 (소수 첫째 자리). 아무도 별점이 없으면 null */
export function averageRating(item: BucketItem, ctx: ReviewCtx): number | null {
  if (!item.done) return null;
  if (!ctx.inSpace) return item.done.rating;
  const rated = ratedReviews(item);
  if (rated.length === 0) return null;
  const sum = rated.reduce((acc, r) => acc + (r.rating ?? 0), 0);
  return Math.round((sum / rated.length) * 10) / 10;
}

/** 목록·카드에 보여줄 별점: 내 별점, 없으면 모두의 평균 */
export function shownRating(item: BucketItem, ctx: ReviewCtx): number | null {
  return myRating(item, ctx) ?? averageRating(item, ctx);
}

/**
 * 내 기준으로 본 항목: done.rating·done.review를 내 별점·소감으로, 사진은 모두의 사진으로 바꿔 둔다.
 * (함께한 것 목록·통계·공유 카드처럼 별점 하나만 보여주는 곳에서 그대로 쓰려고)
 * 내 별점이 없으면 모두의 평균, 그것도 없으면 0(별 없음)
 */
export function viewForMe(item: BucketItem, ctx: ReviewCtx): BucketItem {
  if (!item.done || !ctx.inSpace) return item;
  const mine = myReview(item, ctx.userId);
  // 사진은 모두가 올린 것을 모아서
  const photos = allRecordPhotos(item).map(({ uri, path }) => ({ uri, path }));
  return {
    ...item,
    done: withRecordPhotos(
      {
        ...item.done,
        rating: Math.round(shownRating(item, ctx) ?? 0),
        review: mine?.review ?? '',
      },
      photos
    ),
  };
}
