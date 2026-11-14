import { useEffect } from 'react';

import { listMemoryShares } from '@/lib/supabase/memoryShare';
import { useSpaceStore } from '@/store/useSpaceStore';

/**
 * 화면 없이, 기간이 지난 '웹 링크로 공유'의 사진을 지우는 컴포넌트 (루트 레이아웃에 한 번).
 * 서버는 기간이 지난 링크를 열리지 않게만 막아서, 공개 저장소의 사진 사본은 앱을 켤 때 여기서 지운다.
 */
export function MemoryShareSync() {
  const userId = useSpaceStore((s) => s.userId);

  useEffect(() => {
    if (!userId) return;
    // 목록을 읽으면서 지난 링크를 지운다. 못 지우면 다음에 켤 때 다시 한다
    listMemoryShares().catch(() => {});
  }, [userId]);

  return null;
}
