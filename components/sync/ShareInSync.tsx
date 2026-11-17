import { router } from 'expo-router';
import { useShareIntent } from 'expo-share-intent';
import { useEffect } from 'react';

import { sharedParams, sharedPrefill } from '@/lib/shareIn';
import { trackStep } from '@/lib/steps';

/**
 * 화면 없이, 다른 앱에서 '공유 → DoIt2'로 넘어온 글·링크를 받아 담기 화면을 여는 컴포넌트
 * (루트 레이아웃에 한 번, 새 빌드부터). 공유 모듈이 없는 빌드에서는 받을 게 없어서 아무 일도 하지 않는다.
 */
export function ShareInSync() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

  useEffect(() => {
    if (!hasShareIntent) return;
    const prefill = sharedPrefill(shareIntent);
    // 같은 공유를 두 번 열지 않게 먼저 비운다
    resetShareIntent();
    if (!prefill) return;
    trackStep(
      'share_in',
      prefill.mapText ? 'map' : prefill.url ? 'link' : 'text'
    );
    router.push({ pathname: '/item/new', params: sharedParams(prefill) });
  }, [hasShareIntent, shareIntent, resetShareIntent]);

  return null;
}
