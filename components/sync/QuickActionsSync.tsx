import { type Href, router } from 'expo-router';
import { useEffect } from 'react';

import {
  quickActionHref,
  quickActionItems,
  quickActionsAvailable,
} from '@/lib/quickActions';

/**
 * 화면 없이, 앱 아이콘을 꾹 눌렀을 때의 바로가기를 등록하고 눌리면 그 화면으로 보내는 컴포넌트
 * (루트 레이아웃에 한 번). 바로가기 모듈이 없는 예전 빌드에서는 아무 일도 하지 않는다.
 */
export function QuickActionsSync() {
  useEffect(() => {
    if (!quickActionsAvailable()) return;
    let remove: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      try {
        const QuickActions = await import('expo-quick-actions');
        if (cancelled) return;
        await QuickActions.setItems(quickActionItems());
        const go = (action: unknown) => {
          const href = quickActionHref(action);
          if (href) router.push(href as Href);
        };
        // 바로가기로 앱을 켰을 때
        go(QuickActions.initial);
        // 앱이 켜져 있는 동안 눌렸을 때
        const subscription = QuickActions.addListener(go);
        remove = () => subscription.remove();
        if (cancelled) remove();
      } catch {
        // 바로가기는 없어도 되는 기능이라 실패해도 그냥 둔다
      }
    })();
    return () => {
      cancelled = true;
      remove?.();
    };
  }, []);

  return null;
}
