import { useMemo } from 'react';

import { PERSONAL } from '@/components/space/SpaceSwitcher';
import { LOCAL_KEY, useBucketStore } from '@/store/useBucketStore';
import { useSpaceStore } from '@/store/useSpaceStore';

/** 가져올 곳: '나만 보기' 또는 내가 공간장인 공간 */
export type ImportSource = {
  id: string;
  name: string;
  emoji: string;
  imagePath: string | null;
};

/**
 * 가져올 수 있는 곳들: 내가 공간장인 다른 공간 (+ 지금이 공간이면 '나만 보기').
 * 버킷리스트 화면에서 '가져오기'를 보여줄지 정할 때도 쓴다.
 */
export function useImportSources(): ImportSource[] {
  const spaces = useSpaceStore((s) => s.spaces);
  const userId = useSpaceStore((s) => s.userId);
  const spaceId = useBucketStore((s) => s.spaceId);
  // '나만 보기'는 아직 안 한 항목이 있을 때만 가져올 곳으로 보여준다
  const localHasTodo = useBucketStore((s) =>
    (s.cache[LOCAL_KEY] ?? []).some((it) => !it.done)
  );
  return useMemo(() => {
    const owned = spaces
      .filter((s) => s.owner_id === userId && s.id !== spaceId)
      .map((s) => ({
        id: s.id,
        name: s.name,
        emoji: s.emoji,
        imagePath: s.image_path,
      }));
    return spaceId === null || !localHasTodo
      ? owned
      : [
          {
            id: LOCAL_KEY,
            name: PERSONAL.name,
            emoji: PERSONAL.emoji,
            imagePath: null,
          },
          ...owned,
        ];
  }, [spaces, userId, spaceId, localHasTodo]);
}
