import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { pingServer, useConnectionStore } from '@/lib/connection';
import { useBucketStore } from '@/store/useBucketStore';
import { useOutboxStore } from '@/store/useOutboxStore';
import { useSpaceStore } from '@/store/useSpaceStore';

/** 오프라인일 때 서버에 다시 닿는지 확인하는 간격 */
const RETRY_MS = 5000;

/**
 * 화면 없이 연결을 챙기는 컴포넌트 (루트 레이아웃에 한 번 둔다).
 * - 오프라인이면 앱이 앞에 있는 동안 5초마다 서버에 닿는지 확인한다
 * - 다시 연결되면: 로그인·공간 확인을 다시 하고, 대기 중인 변경을 올린 뒤 목록을 받아온다
 * - 앱으로 돌아올 때마다 대기 중인 변경을 올려본다
 */
export function ConnectionSync() {
  const online = useConnectionStore((s) => s.online);
  const spaces = useSpaceStore((s) => s.spaces);
  const status = useSpaceStore((s) => s.status);
  const wasOnline = useRef(online);

  // 오프라인: 주기적으로 다시 확인
  useEffect(() => {
    if (online) return;
    const tick = () => {
      if (AppState.currentState === 'active') void pingServer();
    };
    const timer = setInterval(tick, RETRY_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [online]);

  // 오프라인 → 온라인
  useEffect(() => {
    const back = online && !wasOnline.current;
    wasOnline.current = online;
    if (!back) return;
    const space = useSpaceStore.getState();
    if (space.status !== 'ready') {
      // 켤 때 연결이 안 됐으면 로그인·공간 확인부터 다시 (끝나면 SpaceSync가 목록을 받는다)
      void space.init();
      return;
    }
    // 대기 중인 변경을 먼저 올리고 받아온다 (pull이 올리기까지 한다)
    void useBucketStore
      .getState()
      .pull()
      .catch(() => {});
    void useBucketStore.getState().flushPending();
    void space.refreshSpaces().catch(() => {});
  }, [online]);

  // 앱으로 돌아오면 남은 변경을 올려본다 ('나만 보기' 중에도 다른 공간 변경이 남아 있을 수 있다)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void useBucketStore.getState().flushPending();
    });
    return () => sub.remove();
  }, []);

  // 나간(또는 내보내진) 공간의 변경은 올릴 수 없으니 버린다
  useEffect(() => {
    if (status !== 'ready') return;
    const mine = new Set(spaces.map((s) => s.id));
    const outbox = useOutboxStore.getState();
    const stale = new Set(
      Object.values(outbox.entries)
        .map((e) => e.spaceId)
        .filter((id) => !mine.has(id))
    );
    for (const id of stale) outbox.dropSpace(id);
  }, [status, spaces]);

  return null;
}
