import type { BucketItem } from '@/lib/bucket/types';

/**
 * 사진을 올린 결과를 지금 항목에 합친다.
 * 사진을 올리는 동안(몇 초) 사용자가 같은 항목을 또 고쳤을 수 있다. 올리기 전 사본(before)에 경로를 붙인 것(uploaded)으로
 * 통째로 바꾸면 그 수정이 사라지니, 지금 항목(latest)에 사진 경로만 붙인다.
 * 그 사이 사진 자체를 바꿨으면(기록 사진이든 항목 사진이든) 그 칸은 지금 것을 그대로 둔다. 그 변경을 올릴 때 다시 올라간다.
 */
export function mergeUploadedItem(
  latest: BucketItem,
  before: BucketItem,
  uploaded: BucketItem
): BucketItem {
  if (latest === before) return uploaded;
  return {
    ...latest,
    done: latest.done === before.done ? uploaded.done : latest.done,
    photos: latest.photos === before.photos ? uploaded.photos : latest.photos,
  };
}
