/**
 * 사람마다 따로 남기는 별점·소감 계산.
 * - '나만 보기': 지금처럼 done.rating·done.review 하나만 있다
 * - 공간: done은 함께한 기록(날짜·사진), 별점·소감은 reviews에 사람마다
 */
import type { BucketItem, ItemReview } from './types';

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
 * 내 기준으로 본 항목: done.rating·done.review를 내 별점·소감으로 바꿔 둔다.
 * (함께한 것 목록·통계·공유 카드처럼 별점 하나만 보여주는 곳에서 그대로 쓰려고)
 * 내 별점이 없으면 모두의 평균, 그것도 없으면 0(별 없음)
 */
export function viewForMe(item: BucketItem, ctx: ReviewCtx): BucketItem {
  if (!item.done || !ctx.inSpace) return item;
  const mine = myReview(item, ctx.userId);
  return {
    ...item,
    done: {
      ...item.done,
      rating: Math.round(shownRating(item, ctx) ?? 0),
      review: mine?.review ?? '',
    },
  };
}
