import { useEffect } from 'react';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase/client';
import type { BucketItemRow } from '@/lib/supabase/database.types';
import { useBucketStore } from '@/store/useBucketStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useSpaceStore } from '@/store/useSpaceStore';

/**
 * 화면 없이 뒤에서 동기화만 하는 컴포넌트 (루트 레이아웃에 한 번 둔다).
 * - 앱을 켜면 익명 로그인 → 내 공간 목록 확인
 * - 보고 있는 공간이 없어졌으면(나가짐) '나만 보기'로 돌아간다
 * - 보고 있는 공간의 변경을 실시간으로 받고, 앱으로 돌아오면 다시 받아온다
 */
export function SpaceSync() {
  const status = useSpaceStore((s) => s.status);
  const spaces = useSpaceStore((s) => s.spaces);
  const spaceId = useBucketStore((s) => s.spaceId);
  const userId = useSpaceStore((s) => s.userId);

  useEffect(() => {
    void useSpaceStore.getState().init();
  }, []);

  // 로그인되거나 계정을 불러오면 내 프로필을 받는다
  useEffect(() => {
    if (status !== 'ready') return;
    void useProfileStore
      .getState()
      .load()
      .catch(() => {});
  }, [status, userId]);

  // 보고 있는 공간이 내 공간 목록에 없으면 '나만 보기'로
  useEffect(() => {
    if (status !== 'ready' || !spaceId) return;
    if (!spaces.some((s) => s.id === spaceId)) {
      void useBucketStore.getState().switchSpace(null);
    }
  }, [status, spaces, spaceId]);

  useEffect(() => {
    if (status !== 'ready' || !spaceId) return;
    void useBucketStore
      .getState()
      .pull()
      .catch((e) => console.warn('[sync] pull failed', e));

    const onRow = (payload: { new: unknown }) =>
      useBucketStore.getState().applyRemoteRow(payload.new as BucketItemRow);
    const refreshSpaces = () =>
      void useSpaceStore
        .getState()
        .refreshSpaces()
        .catch(() => {});

    const channel = supabase
      .channel(`space-${spaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bucket_items',
          filter: `space_id=eq.${spaceId}`,
        },
        onRow
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bucket_items',
          filter: `space_id=eq.${spaceId}`,
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
      // 누가 들어오거나 나가면 인원 수를 다시 센다
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'space_members',
          filter: `space_id=eq.${spaceId}`,
        },
        refreshSpaces
      )
      .subscribe();

    const appState = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void useBucketStore
        .getState()
        .pull()
        .catch(() => {});
      refreshSpaces();
    });

    return () => {
      appState.remove();
      void supabase.removeChannel(channel);
    };
  }, [status, spaceId]);

  return null;
}
