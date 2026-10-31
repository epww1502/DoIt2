import { useMemo } from 'react';

import { themeSurface } from '@/constants/themeSurface';
import { useThemeMode } from '@/contexts/ThemeModeContext';
import { usePrimaryColor } from '@/store/useSettingsStore';

/** 지금 테마색·라이트/다크에 맞춘 배경·카드·테두리 색 (JS로 직접 칠할 때) */
export function useSurface() {
  const primary = usePrimaryColor();
  const { colorScheme } = useThemeMode();
  return useMemo(
    () => themeSurface(primary, colorScheme),
    [primary, colorScheme]
  );
}
