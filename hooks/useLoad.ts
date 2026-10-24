import { useCallback, useEffect, useState, type DependencyList } from 'react';

import { noteFailure, useConnectionStore } from '@/lib/connection';

export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; data: T };

/**
 * 서버에서 무언가를 불러오는 화면용 훅.
 * - 처음 열 때와 deps가 바뀔 때 불러온다
 * - 실패하면 status 'error' (ErrorState로 보여주고 reload로 다시 시도)
 * - 오프라인이라 실패했다가 다시 연결되면 저절로 다시 불러온다
 *
 * const state = useLoad(() => fetchSomething(id), [id]);
 */
export function useLoad<T>(load: () => Promise<T>, deps: DependencyList) {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data });
      })
      .catch((error: unknown) => {
        noteFailure(error);
        if (!cancelled) setState({ status: 'error', error });
      });
    return () => {
      cancelled = true;
    };
    // load는 매번 새로 만들어지므로 deps로만 다시 불러온다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  // 실패한 상태에서 인터넷이 다시 연결되면 저절로 다시 불러온다
  useEffect(() => {
    if (state.status !== 'error') return;
    return useConnectionStore.subscribe((s, prev) => {
      if (s.online && !prev.online) reload();
    });
  }, [state.status, reload]);

  return { state, reload };
}
