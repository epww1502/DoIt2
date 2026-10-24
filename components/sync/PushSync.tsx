import { router } from 'expo-router';
import { useEffect } from 'react';

import { onNotificationOpen, registerForPush, type PushData } from '@/lib/push';
import { useBucketStore } from '@/store/useBucketStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useSpaceStore } from '@/store/useSpaceStore';

/** 알림을 누르면 그 공간으로 바꾸고 (하나면) 그 항목을 연다 */
async function openFromNotification(data: PushData) {
  const { spaceId, itemId } = data;
  if (
    spaceId &&
    useSpaceStore.getState().spaces.some((s) => s.id === spaceId)
  ) {
    if (useBucketStore.getState().spaceId !== spaceId) {
      await useBucketStore
        .getState()
        .switchSpace(spaceId)
        .catch(() => {});
    }
  }
  if (itemId) {
    router.push({ pathname: '/item/[id]', params: { id: itemId } });
  } else {
    router.navigate('/');
  }
}

/**
 * 화면 없이 알림만 챙기는 컴포넌트 (루트 레이아웃에 한 번).
 * - 공간에 들어가 있고 알림을 켜 두었으면 이 폰을 알림 받는 폰으로 등록한다
 * - 알림을 누르면 그 항목으로 간다
 */
export function PushSync() {
  const status = useSpaceStore((s) => s.status);
  const userId = useSpaceStore((s) => s.userId);
  const hasSpace = useSpaceStore((s) => s.spaces.length > 0);
  const pushEnabled = useSettingsStore((s) => s.pushEnabled);

  useEffect(() => {
    if (status !== 'ready' || !hasSpace || !pushEnabled) return;
    registerForPush().catch((e) => console.warn('[push] register failed', e));
  }, [status, userId, hasSpace, pushEnabled]);

  useEffect(() => {
    let off: (() => void) | undefined;
    let cancelled = false;
    onNotificationOpen((data) => void openFromNotification(data))
      .then((unsubscribe) => {
        if (cancelled) unsubscribe();
        else off = unsubscribe;
      })
      // 알림을 못 쓰는 앱이어도 앱은 그대로 돌아가게
      .catch((e) => console.warn('[push] open listener failed', e));
    return () => {
      cancelled = true;
      off?.();
    };
  }, []);

  return null;
}
