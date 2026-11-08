import { allRecordPhotos, type AuthoredPhoto } from './reviews';
import type { BucketItem } from './types';

/** 앨범 사진 한 장: 어느 기록 사진인지와 함께 */
export type AlbumPhoto = AuthoredPhoto & { item: BucketItem };

/** 앨범의 한 달 */
export type AlbumMonth = { month: string; photos: AlbumPhoto[] };

/**
 * 기록 사진을 모두 모은다. 최근에 한 기록이 먼저,
 * 한 기록 안에서는 기록 화면과 같은 순서 (함께 붙어 있던 사진 → 먼저 평가한 사람)
 */
export function albumPhotos(items: BucketItem[]): AlbumPhoto[] {
  return items
    .filter((it) => it.done)
    .sort(
      (a, b) =>
        b.done!.date.localeCompare(a.done!.date) ||
        b.createdAt.localeCompare(a.createdAt)
    )
    .flatMap((item) =>
      allRecordPhotos(item)
        .filter((p) => p.uri || p.path)
        .map((p) => ({ ...p, item }))
    );
}

/** 기록한 달(YYYY-MM)로 묶는다 (순서는 그대로) */
export function albumMonths(photos: AlbumPhoto[]): AlbumMonth[] {
  const months: AlbumMonth[] = [];
  for (const photo of photos) {
    const month = photo.item.done!.date.slice(0, 7);
    const last = months[months.length - 1];
    if (last?.month === month) last.photos.push(photo);
    else months.push({ month, photos: [photo] });
  }
  return months;
}

/** 사진 하나를 가리키는 값 (서버 경로가 있으면 경로, 없으면 이 폰 파일) */
export function photoKey(photo: { uri: string | null; path: string | null }) {
  return photo.path ?? photo.uri ?? '';
}
