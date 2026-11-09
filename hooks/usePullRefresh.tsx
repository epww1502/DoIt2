import { useState } from 'react';
import { RefreshControl } from 'react-native';

import { themeColors } from '@/constants/colors';
import { useThemeMode } from '@/contexts/ThemeModeContext';
import { useBucketStore } from '@/store/useBucketStore';
import { useSpaceStore } from '@/store/useSpaceStore';

/**
 * 목록을 아래로 당기면 서버에서 다시 받는다 (공간 항목·평가·사진, 멤버 수).
 * 스크롤 목록의 refreshControl에 그대로 넘긴다. 실패해도 조용히 멈춘다
 */
export function usePullRefresh() {
  const [refreshing, setRefreshing] = useState(false);
  const { colorScheme } = useThemeMode();

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([
        useBucketStore.getState().pull(),
        useSpaceStore.getState().refreshSpaces(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => void onRefresh()}
      tintColor={themeColors[colorScheme].mutedForeground}
    />
  );
}
