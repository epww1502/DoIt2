import { Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { vars } from 'nativewind';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';
import '../global.css';
import '@/lib/date';

import { DialogHost } from '@/components/atoms/DialogHost';
import { PushSync } from '@/components/sync/PushSync';
import { SpaceSync } from '@/components/sync/SpaceSync';
import { VersionGate } from '@/components/sync/VersionGate';
import { hexToRgbTriple } from '@/constants/palettes';
import { NAV_THEME } from '@/constants/theme';
import { ThemeModeProvider, useThemeMode } from '@/contexts/ThemeModeContext';
import { useFontsLoader } from '@/hooks/useFontsLoader';
import { useStartupUpdate } from '@/hooks/useStartupUpdate';
import { useBucketStoreHydrated } from '@/store/useBucketStore';
import { usePrimaryColor } from '@/store/useSettingsStore';

export default function RootLayout() {
  return (
    <ThemeModeProvider>
      <RootLayoutInner />
    </ThemeModeProvider>
  );
}

function RootLayoutInner() {
  const { fontsLoaded, fontError } = useFontsLoader();
  const { colorScheme } = useThemeMode();
  const hydrated = useBucketStoreHydrated();
  const primary = usePrimaryColor();
  // 켤 때 스플래시 동안 새 업데이트를 받아 바로 적용한다
  const updateChecked = useStartupUpdate();
  const ready =
    (fontsLoaded || Boolean(fontError)) && hydrated && updateChecked;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);
  // 설정에서 고른 테마색을 CSS 변수로 깔아서 bg-primary·text-primary 등이 모두 따라 바뀌게 한다
  const themeVars = useMemo(
    () => vars({ '--color-primary': hexToRgbTriple(primary) }),
    [primary]
  );

  if (!ready) return null;

  return (
    <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
      {/* 로그인·공간 확인·실시간 동기화 (화면 없음) */}
      <SpaceSync />
      {/* 알림 등록·알림 눌러 열기 (화면 없음) */}
      <PushSync />
      {/* showAlert 팝업 (기본 Alert 대신) */}
      <DialogHost />
      {/* 설치된 빌드가 너무 오래됐으면 스토어 업데이트 안내 */}
      <VersionGate />
      <View className="flex-1 bg-background" style={themeVars}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="item/new"
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="record/[id]"
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="item/search-place"
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="item/shared"
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="item/import"
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="item/redo"
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="space/index" />
          <Stack.Screen name="space/profile" />
          <Stack.Screen name="space/list" />
          <Stack.Screen name="done/map" />
          <Stack.Screen name="done/stats" />
          <Stack.Screen
            name="share/[id]"
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="profile" />
          <Stack.Screen name="account/restore" />
          <Stack.Screen
            name="space/new"
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="space/join"
            options={{ animation: 'slide_from_bottom' }}
          />
        </Stack>
      </View>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
