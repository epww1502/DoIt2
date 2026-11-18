import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** 새 업데이트가 있는지 묻는 데 기다리는 시간 */
const CHECK_TIMEOUT_MS = 4000;
/** 켤 때: 새 업데이트를 받는 데 기다리는 시간 (넘으면 이번엔 지금 버전으로 켜고, 다 받으면 아래 띠로 알린다) */
const STARTUP_FETCH_TIMEOUT_MS = 12000;

export const RELOAD_OPTIONS = {
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
 * 새 업데이트가 있으면 받는다. reloadWithinMs가 있으면 그 안에 다 받았을 때 바로 다시 켠다.
 * 다시 켜지 않고 받기만 끝나면 아래 띠(UpdateReadyBanner)가 '다시 시작'을 권한다.
 * 인터넷이 없거나 느려서 확인을 못 하면 조용히 넘어간다
 */
export async function applyUpdate(reloadWithinMs?: number) {
  try {
    const check = await withTimeout(
      Updates.checkForUpdateAsync(),
      CHECK_TIMEOUT_MS
    );
    if (!check.isAvailable) return;
    const fetching = Updates.fetchUpdateAsync();
    if (reloadWithinMs === undefined) {
      await fetching;
      return;
    }
    // 시간이 넘어도 받기는 이어지고, 다 받으면 띠가 뜬다
    const fetched = await withTimeout(fetching, reloadWithinMs);
    if (fetched.isNew) await Updates.reloadAsync(RELOAD_OPTIONS);
  } catch {
    // 인터넷이 없거나 느리면 지금 버전 그대로
  }
}

/**
 * 앱을 켤 때 스플래시가 떠 있는 동안 새 업데이트를 확인하고, 있으면 받아서 바로 다시 켠다.
 * 켜 둔 채로 쓰다가 앱으로 돌아올 때도 확인하고 받아 두기만 한다 (쓰던 내용이 날아가지 않게 저절로 다시 켜지 않는다).
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
      void applyUpdate().finally(() => {
        checking = false;
      });
    });
    return () => sub.remove();
  }, [skip, done]);

  return done;
}
