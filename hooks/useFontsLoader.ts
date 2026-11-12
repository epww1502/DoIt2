import { DoHyeon_400Regular } from '@expo-google-fonts/do-hyeon';
import { Gaegu_700Bold } from '@expo-google-fonts/gaegu';
import { Jua_400Regular } from '@expo-google-fonts/jua';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { applyTitleFont, TITLE_FONTS, type TitleFont } from '@/constants/fonts';
import { useSettingsStore } from '@/store/useSettingsStore';

// 스플래시 자동 숨김 방지 (글꼴·저장된 데이터·업데이트 확인이 끝나면 루트 레이아웃에서 숨긴다)
SplashScreen.preventAutoHideAsync();

const PRETENDARD = {
  'Pretendard-Thin': require('../assets/fonts/Pretendard-Thin.otf'),
  'Pretendard-ExtraLight': require('../assets/fonts/Pretendard-ExtraLight.otf'),
  'Pretendard-Light': require('../assets/fonts/Pretendard-Light.otf'),
  'Pretendard-Regular': require('../assets/fonts/Pretendard-Regular.otf'),
  'Pretendard-Medium': require('../assets/fonts/Pretendard-Medium.otf'),
  'Pretendard-SemiBold': require('../assets/fonts/Pretendard-SemiBold.otf'),
  'Pretendard-Bold': require('../assets/fonts/Pretendard-Bold.otf'),
  'Pretendard-ExtraBold': require('../assets/fonts/Pretendard-ExtraBold.otf'),
  'Pretendard-Black': require('../assets/fonts/Pretendard-Black.otf'),
};

/** 제목 글씨체 파일 (고딕은 위 Pretendard-Bold를 그대로 쓴다) */
const TITLE_FILES: Partial<Record<TitleFont, number>> = {
  jua: Jua_400Regular,
  dohyeon: DoHyeon_400Regular,
  gaegu: Gaegu_700Bold,
};

/** 고른 제목 글씨체만 불러온다 (설정을 읽은 뒤에) */
function loadAll() {
  const font = useSettingsStore.getState().titleFont;
  applyTitleFont(font);
  const file = TITLE_FILES[font];
  return Font.loadAsync(
    file ? { ...PRETENDARD, [TITLE_FONTS[font].family]: file } : PRETENDARD
  );
}

export function useFontsLoader() {
  const [fontsLoaded, setLoaded] = useState(false);
  const [fontError, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = () =>
      loadAll()
        .then(() => !cancelled && setLoaded(true))
        .catch((e: Error) => !cancelled && setError(e));
    // 저장된 설정(고른 글씨체)을 다 읽은 뒤에 불러온다
    if (useSettingsStore.persist.hasHydrated()) {
      void run();
      return () => {
        cancelled = true;
      };
    }
    const stop = useSettingsStore.persist.onFinishHydration(() => void run());
    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  return { fontsLoaded, fontError };
}
