import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { showAlert } from '@/lib/dialog';

/** 새 업데이트가 있는지 묻는 데 기다리는 시간 */
const CHECK_TIMEOUT_MS = 4000;
/** 켤 때: 새 업데이트를 받는 데 기다리는 시간 (넘으면 이번엔 지금 버전으로 켜고, 받은 건 다음에 켤 때 적용) */
const STARTUP_FETCH_TIMEOUT_MS = 12000;
/** 돌아올 때: 이 안에 받으면 바로 다시 켠다. 넘으면 다 받은 뒤 물어본다 (그사이 쓰던 내용이 날아가지 않게) */
const RESUME_FETCH_TIMEOUT_MS = 4000;

const RELOAD_OPTIONS = {
  // 스플래시와 같은 색으로 다시 켠다
  reloadScreenOptions: { backgroundColor: '#5AB0FF' },
};

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    ),
  ]);
}

/**
 * 새 업데이트가 있으면 받아서 다시 켠다.
 * fetchTimeoutMs 안에 못 받으면: onSlowReady가 있으면 다 받은 뒤 그걸 부르고, 없으면 다음에 켤 때 적용된다.
 * 인터넷이 없거나 느려서 확인을 못 하면 조용히 넘어간다
 */
export async function applyUpdate(
  fetchTimeoutMs: number,
  onSlowReady?: () => void
) {
  try {
    const check = await withTimeout(
      Updates.checkForUpdateAsync(),
      CHECK_TIMEOUT_MS
    );
    if (!check.isAvailable) return;
    const fetching = Updates.fetchUpdateAsync();
    let fetched: Awaited<typeof fetching>;
    try {
      fetched = await withTimeout(fetching, fetchTimeoutMs);
    } catch {
      if (!onSlowReady) return;
      // 늦게라도 다 받으면 물어본다
      if ((await fetching).isNew) onSlowReady();
      return;
    }
    if (fetched.isNew) await Updates.reloadAsync(RELOAD_OPTIONS);
  } catch {
    // 인터넷이 없거나 느리면 지금 버전 그대로
  }
}

function askReload() {
  showAlert(
    '새 버전이 준비됐어요',
    '지금 다시 불러올까요? 쓰던 글이 있으면 먼저 저장해 주세요.',
    [
      { text: '나중에', style: 'cancel' },
      {
        text: '다시 불러오기',
        onPress: () => Updates.reloadAsync(RELOAD_OPTIONS),
      },
    ]
  );
}

/**
 * 앱을 켤 때 스플래시가 떠 있는 동안 새 업데이트를 확인하고, 있으면 받아서 바로 다시 켠다.
 * 켜 둔 채로 쓰다가 앱으로 돌아올 때도 확인한다 (못 느낄 만큼 짧은 요청, 새 버전이 있을 때만 다시 켜진다).
 * 켤 때 확인이 끝나면(또는 개발 중·Expo Go·인터넷이 느릴 때) true를 돌려준다.
 */
export function useStartupUpdate() {
  const skip = __DEV__ || !Updates.isEnabled;
  const [done, setDone] = useState(skip);

  useEffect(() => {
    if (skip) return;
    let cancelled = false;
    void applyUpdate(STARTUP_FETCH_TIMEOUT_MS).finally(() => {
      if (!cancelled) setDone(true);
    });
    return () => {
      cancelled = true;
    };
  }, [skip]);

  useEffect(() => {
    if (skip || !done) return;
    let checking = false;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || checking) return;
      checking = true;
      void applyUpdate(RESUME_FETCH_TIMEOUT_MS, askReload).finally(() => {
        checking = false;
      });
    });
    return () => sub.remove();
  }, [skip, done]);

  return done;
}
