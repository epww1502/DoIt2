import type { ReviewCtx } from '@/lib/bucket/reviews';
import { useBucketStore } from '@/store/useBucketStore';
import { useSpaceStore } from '@/store/useSpaceStore';

/** 별점·상태를 누구 기준으로 볼지 (내 계정, 공간을 보고 있는지) */
export function useReviewCtx(): ReviewCtx {
  const userId = useSpaceStore((s) => s.userId);
  const inSpace = useBucketStore((s) => s.spaceId !== null);
  return { userId, inSpace };
}

/** 스토어 밖(이벤트 처리 등)에서 쓸 때 */
export function getReviewCtx(): ReviewCtx {
  return {
    userId: useSpaceStore.getState().userId,
    inSpace: useBucketStore.getState().spaceId !== null,
  };
}
