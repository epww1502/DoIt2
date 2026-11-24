import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { enabledIconCount } from '@/lib/appIcon';
import { showAlert } from '@/lib/dialog';

const SEEN_KEY = 'doit2-icon-cleanup-notice';

/**
 * 화면 없이, 옛 버전(0.3.0)에서 홈 화면 앱 아이콘이 여러 개로 늘어난 사람에게 한 번 알린다 (안드로이드, 0.3.1 빌드부터).
 * 늘어난 아이콘은 아이콘을 한 번 더 바꾸면(같은 아이콘이어도) 하나만 남는다.
 */
export function IconCleanupNotice() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let alive = true;
    void (async () => {
      try {
        if ((await AsyncStorage.getItem(SEEN_KEY)) === '1') return;
        const count = await enabledIconCount();
        if (!alive || count === null || count < 2) return;
        await AsyncStorage.setItem(SEEN_KEY, '1');
        showAlert(
          '홈 화면에 앱이 여러 개 보이나요?',
          `예전 버전에서 앱 아이콘을 바꿀 때마다 홈 화면에 DoIt2가 하나씩 늘어나는 문제가 있었어요. 지금 ${count}개가 켜져 있어요. 아이콘을 한 번만 다시 고르면 하나만 남아요. 고르면 앱이 한 번 닫혀요.`,
          [
            {
              text: '아이콘 정리하기',
              onPress: () => router.push('/app-icon'),
            },
            { text: '나중에', style: 'cancel' },
          ]
        );
      } catch {
        // 못 알려도 앱은 그대로 쓸 수 있다
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return null;
}
