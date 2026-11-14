/**
 * 추억 공유: '올해의 우리'를 웹 페이지(site/memories.html)로 나눌 때 서버에 올릴 내용.
 * 여기 담긴 것만 공개된다. 주소·멤버 이름·쓴 돈·메모는 넣지 않는다.
 */
import { getCategory, type BucketItem } from './types';
import type { YearRecap } from './yearRecap';

/** 링크 하나에 넣을 수 있는 사진 수 (서버도 같은 수로 막는다) */
export const MAX_SHARE_PHOTOS = 12;
/** 링크가 열려 있는 날 수 (서버의 expires_at 기본값과 같다) */
export const MEMORY_SHARE_DAYS = 30;
/** 별점 높은 기록은 몇 개까지 */
const MAX_BEST = 5;
const MAX_REVIEW = 200;

/** 공유 페이지가 열리는 주소 */
const MEMORY_URL = 'https://doit2app.github.io/memories.html';

export type MemoryRecord = {
  title: string;
  emoji: string;
  /** YYYY-MM-DD */
  date: string;
  rating: number;
  /** 한 줄 후기 (빼고 공유하면 빈 글자) */
  review: string;
};

export type MemoryPhoto = {
  /** 저장소 파일 이름 ('0.jpg'). 폴더는 공유 id */
  file: string;
  title: string;
  date: string;
};

export type MemoryPayload = {
  v: 1;
  /** 공간 이름 (나만 보기면 빈 글자) */
  space: string;
  emoji: string;
  /** 함께 쓰는 공간인지 ('함께 해냈어요' / '해냈어요') */
  together: boolean;
  total: number;
  places: number;
  activities: number;
  days: number;
  /** 평균 별점 (없으면 0) */
  rating: number;
  /** 1월~12월에 해낸 수 */
  months: number[];
  topArea: { name: string; count: number } | null;
  topCategory: { label: string; emoji: string; count: number } | null;
  best: MemoryRecord[];
  photos: MemoryPhoto[];
};

type Options = {
  space: string;
  emoji: string;
  together: boolean;
  /** 한 줄 후기를 같이 보여줄지 */
  withReviews: boolean;
  /** 고른 사진이 달린 기록들 (고른 순서대로) */
  photoItems: BucketItem[];
};

export function buildMemoryPayload(
  recap: YearRecap,
  options: Options
): MemoryPayload {
  const months = Array.from({ length: 12 }, () => 0);
  for (const it of recap.items) {
    months[Number(it.done!.date.slice(5, 7)) - 1] += 1;
  }

  const best = recap.items
    .filter((it) => it.done!.rating > 0)
    .sort(
      (a, b) =>
        b.done!.rating - a.done!.rating ||
        Number(Boolean(b.done!.review)) - Number(Boolean(a.done!.review)) ||
        b.done!.date.localeCompare(a.done!.date)
    )
    .slice(0, MAX_BEST)
    .map((it): MemoryRecord => ({
      title: it.title,
      emoji: getCategory(it.category).emoji,
      date: it.done!.date,
      rating: it.done!.rating,
      review: options.withReviews
        ? it.done!.review.trim().slice(0, MAX_REVIEW)
        : '',
    }));

  return {
    v: 1,
    space: options.space,
    emoji: options.emoji,
    together: options.together,
    total: recap.total,
    places: recap.places,
    activities: recap.activities,
    days: recap.days,
    rating: Math.round(recap.averageRating * 10) / 10,
    months,
    topArea: recap.topArea,
    topCategory: recap.topCategory
      ? {
          label: recap.topCategory.label,
          emoji: getCategory(recap.topCategory.key).emoji,
          count: recap.topCategory.count,
        }
      : null,
    best,
    photos: options.photoItems.slice(0, MAX_SHARE_PHOTOS).map((item, i) => ({
      file: `${i}.jpg`,
      title: item.title,
      date: item.done?.date ?? '',
    })),
  };
}

/** 링크 제목 ('우리 둘의 2026년' / '나의 2026년') */
export function memoryTitle(space: string, year: number) {
  return `${space ? `${space}의` : '나의'} ${year}년`.slice(0, 40);
}

/** 기간이 지나 더는 열리지 않는 링크인지 */
export function isMemoryExpired(expiresAt: string, now: Date) {
  return new Date(expiresAt).getTime() <= now.getTime();
}

export function memoryLink(id: string) {
  return `${MEMORY_URL}?t=${id}`;
}
