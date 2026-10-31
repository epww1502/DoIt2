import { Jua_400Regular } from '@expo-google-fonts/jua';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

// 스플래시 자동 숨김 방지 (글꼴·저장된 데이터·업데이트 확인이 끝나면 루트 레이아웃에서 숨긴다)
SplashScreen.preventAutoHideAsync();

export function useFontsLoader() {
  const [fontsLoaded, fontError] = useFonts({
    'Pretendard-Thin': require('../assets/fonts/Pretendard-Thin.otf'),
    'Pretendard-ExtraLight': require('../assets/fonts/Pretendard-ExtraLight.otf'),
    'Pretendard-Light': require('../assets/fonts/Pretendard-Light.otf'),
    'Pretendard-Regular': require('../assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Medium': require('../assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-SemiBold': require('../assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('../assets/fonts/Pretendard-Bold.otf'),
    'Pretendard-ExtraBold': require('../assets/fonts/Pretendard-ExtraBold.otf'),
    'Pretendard-Black': require('../assets/fonts/Pretendard-Black.otf'),
    // 제목·버튼·칩에 쓰는 동글동글한 글꼴
    Jua: Jua_400Regular,
  });

  return { fontsLoaded, fontError };
}
