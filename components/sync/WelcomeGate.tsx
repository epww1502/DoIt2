import { router, usePathname } from 'expo-router';
import { useEffect, useSyncExternalStore } from 'react';

import { needsWelcome } from '@/lib/onboarding';
import { useBucketStore } from '@/store/useBucketStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useSpaceStore } from '@/store/useSpaceStore';

/** 설정(이 폰에 저장된 값)을 다 읽었는지. 읽기 전에는 '시작 화면을 봤는지'가 항상 아니라고 나온다 */
function useSettingsHydrated() {
  return useSyncExternalStore(
    (onChange) => useSettingsStore.persist.onFinishHydration(onChange),
    () => useSettingsStore.persist.hasHydrated()
  );
}

/**
 * 화면 없이, 처음 켠 사람을 시작 화면(app/welcome.tsx)으로 보내는 컴포넌트 (루트 레이아웃에 한 번).
 * 전부터 쓰던 사람(공간이나 담은 것이 있음)은 시작 화면을 본 것으로 적어 둔다.
 * 초대 링크로 켜서 다른 화면에 있을 때는 보내지 않는다 (첫 화면에 있을 때만).
 */
export function WelcomeGate() {
  const pathname = usePathname();
  const hydrated = useSettingsHydrated();
  const welcomed = useSettingsStore((s) => s.welcomed);
  const settled = useSpaceStore((s) => s.status !== 'loading');
  const spaceCount = useSpaceStore((s) => s.spaces.length);
  // 지금 보는 곳과 다른 곳(나만 보기·다른 공간)에 담아 둔 것까지 센다.
  // 공간을 보고 있었다면(인터넷이 안 돼서 공간 목록을 못 받았을 때도) 쓰던 사람이다
  const itemCount = useBucketStore(
    (s) =>
      (s.spaceId ? 1 : 0) +
      s.items.length +
      Object.values(s.cache).reduce((sum, list) => sum + list.length, 0)
  );

  useEffect(() => {
    if (!hydrated || welcomed || !settled) return;
    if (needsWelcome({ welcomed, settled, spaceCount, itemCount })) {
      if (pathname === '/') router.replace('/welcome');
      return;
    }
    useSettingsStore.getState().setWelcomed(true);
  }, [hydrated, welcomed, settled, spaceCount, itemCount, pathname]);

  return null;
}
