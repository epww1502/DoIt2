import { useEffect } from 'react';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase/client';
import type { BucketItemRow } from '@/lib/supabase/database.types';
import { useBucketStore } from '@/store/useBucketStore';
import { useCoupleStore } from '@/store/useCoupleStore';

/**
 * 화면 없이 뒤에서 동기화만 하는 컴포넌트 (루트 레이아웃에 한 번 둔다).
 * - 앱을 켜면 익명 로그인 → 내 커플 확인
 * - 커플이 있으면 휴대폰 항목을 서버로 옮기고, 실시간으로 상대 변경을 받는다
 * - 앱으로 다시 돌아오면 서버에서 다시 받아온다 (놓친 변경 대비)
 */
export function CoupleSync() {
  const status = useCoupleStore((s) => s.status);
  const coupleId = useCoupleStore((s) => s.couple?.id ?? null);

  useEffect(() => {
    void useCoupleStore.getState().init();
  }, []);

  useEffect(() => {
    if (status !== 'ready') return;
    const bucket = useBucketStore.getState();
    bucket.connect(coupleId).catch((e) => {
      console.warn('[sync] connect failed', e);
    });
    if (!coupleId) return;

    const onRow = (payload: { new: unknown }) =>
      useBucketStore.getState().applyRemoteRow(payload.new as BucketItemRow);

    const channel = supabase
      .channel(`couple-${coupleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bucket_items',
          filter: `couple_id=eq.${coupleId}`,
        },
        onRow
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bucket_items',
          filter: `couple_id=eq.${coupleId}`,
        },
        onRow
      )
      // 지우기 이벤트는 걸러 받을 수 없어서(id만 온다) 전부 받고 id로 지운다
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'bucket_items' },
        (payload) => {
          const id = (payload.old as { id?: string }).id;
          if (id) useBucketStore.getState().applyRemoteDelete(id);
        }
      )
      // 상대가 초대 코드로 들어오면 '연결 완료'로 바뀐다
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'couple_members',
          filter: `couple_id=eq.${coupleId}`,
        },
        () =>
          void useCoupleStore
            .getState()
            .refreshCouple()
            .catch(() => {})
      )
      .subscribe();

    const appState = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void useBucketStore
        .getState()
        .pull()
        .catch(() => {});
      void useCoupleStore
        .getState()
        .refreshCouple()
        .catch(() => {});
    });

    return () => {
      appState.remove();
      void supabase.removeChannel(channel);
    };
  }, [status, coupleId]);

  return null;
}
