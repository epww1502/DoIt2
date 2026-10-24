import { useEffect } from 'react';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase/client';
import type { NotificationRow } from '@/lib/supabase/database.types';
import { useInboxStore } from '@/store/useInboxStore';
import { useSpaceStore } from '@/store/useSpaceStore';

/**
 * 화면 없이 알림함을 챙기는 컴포넌트 (루트 레이아웃에 한 번).
 * 로그인되면 불러오고, 새 알림은 실시간으로 받고, 앱으로 돌아오면 다시 받는다.
 */
export function InboxSync() {
  const status = useSpaceStore((s) => s.status);
  const userId = useSpaceStore((s) => s.userId);

  useEffect(() => {
    if (status !== 'ready' || !userId) return;
    const inbox = useInboxStore.getState();
    inbox.clear();
    void inbox.load();

    const channel = supabase
      .channel(`inbox-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) =>
          useInboxStore.getState().add(payload.new as NotificationRow)
      )
      .subscribe();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void useInboxStore.getState().load();
    });
    return () => {
      sub.remove();
      void supabase.removeChannel(channel);
    };
  }, [status, userId]);

  return null;
}
