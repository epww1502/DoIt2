import { useBucketStore } from '@/store/useBucketStore';
import { useSpaceStore } from '@/store/useSpaceStore';

/**
 * 다른 사람과 함께 쓰는 중인지 ('나만 보기'나 개인 공간이면 false).
 * 화면 문구를 '함께한 것' / '해낸 것'처럼 바꿀 때 쓴다.
 */
export function useTogether() {
  const spaceId = useBucketStore((s) => s.spaceId);
  const personal = useSpaceStore(
    (s) => s.spaces.find((sp) => sp.id === spaceId)?.is_personal ?? false
  );
  return spaceId !== null && !personal;
}
