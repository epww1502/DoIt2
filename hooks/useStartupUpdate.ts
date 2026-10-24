import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';

/** 새 업데이트가 있는지 묻는 데 기다리는 시간 */
const CHECK_TIMEOUT_MS = 4000;
/** 새 업데이트를 받는 데 기다리는 시간 (넘으면 이번엔 지금 버전으로 켜고, 받은 건 다음에 켤 때 적용) */
const FETCH_TIMEOUT_MS = 12000;

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    ),
  ]);
}

/**
 * 앱을 켤 때 스플래시가 떠 있는 동안 새 업데이트를 확인하고, 있으면 받아서 바로 다시 켠다.
 * (예전처럼 앱을 두 번 껐다 켜지 않아도 된다)
 * 확인이 끝나면(또는 개발 중·Expo Go·인터넷이 느릴 때) true를 돌려준다.
 */
export function useStartupUpdate() {
  const skip = __DEV__ || !Updates.isEnabled;
  const [done, setDone] = useState(skip);

  useEffect(() => {
    if (skip) return;
    let cancelled = false;
    const run = async () => {
      try {
        const check = await withTimeout(
          Updates.checkForUpdateAsync(),
          CHECK_TIMEOUT_MS
        );
        if (!check.isAvailable) return;
        const fetched = await withTimeout(
          Updates.fetchUpdateAsync(),
          FETCH_TIMEOUT_MS
        );
        if (fetched.isNew && !cancelled) {
          // 스플래시와 같은 색으로 다시 켠다
          await Updates.reloadAsync({
            reloadScreenOptions: { backgroundColor: '#5AB0FF' },
          });
        }
      } catch {
        // 인터넷이 없거나 느리면 지금 버전으로 켠다
      } finally {
        if (!cancelled) setDone(true);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [skip]);

  return done;
}
