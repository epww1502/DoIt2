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
import { ConnectionSync } from '@/components/sync/ConnectionSync';
import { InboxSync } from '@/components/sync/InboxSync';
import { OfflineBanner } from '@/components/sync/OfflineBanner';
import { PushSync } from '@/components/sync/PushSync';
import { ReminderSync } from '@/components/sync/ReminderSync';
import { SpaceSync } from '@/components/sync/SpaceSync';
import { VersionGate } from '@/components/sync/VersionGate';
import { hexToRgbTriple } from '@/constants/palettes';
import { NAV_THEME } from '@/constants/theme';
import { surfaceVars } from '@/constants/themeSurface';
import { ThemeModeProvider, useThemeMode } from '@/contexts/ThemeModeContext';
import { useFontsLoader } from '@/hooks/useFontsLoader';
import { useStartupUpdate } from '@/hooks/useStartupUpdate';
import { useSurface } from '@/hooks/useSurface';
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
  // 설정에서 고른 테마색을 CSS 변수로 깔아서 bg-primary·text-primary 등이 모두 따라 바뀌게 한다.
  // 배경·카드·테두리도 테마색을 살짝 섞은 색이라 같이 바뀐다
  const surface = useSurface();
  const themeVars = useMemo(
    () =>
      vars({
        '--color-primary': hexToRgbTriple(primary),
        ...surfaceVars(surface),
      }),
    [primary, surface]
  );
  const navTheme = useMemo(() => {
    const base = NAV_THEME[colorScheme ?? 'light'];
    return {
      ...base,
      colors: {
        ...base.colors,
        background: surface.background,
        card: surface.card,
        border: surface.border,
      },
    };
  }, [colorScheme, surface]);

  if (!ready) return null;

  return (
    <ThemeProvider value={navTheme}>
      {/* 로그인·공간 확인·실시간 동기화 (화면 없음) */}
      <SpaceSync />
      {/* 오프라인이면 다시 연결을 시도하고, 연결되면 밀린 변경을 올린다 (화면 없음) */}
      <ConnectionSync />
      {/* 알림 등록·알림 눌러 열기 (화면 없음) */}
      <PushSync />
      {/* 목표 날짜·주말 추천 알림을 폰 안에서 예약 (화면 없음) */}
      <ReminderSync />
      {/* 알림센터: 같은 공간 소식 받기 (화면 없음) */}
      <InboxSync />
      <View className="flex-1 bg-background" style={themeVars}>
        {/* 오프라인 안내 띠: 화면 위를 차지해서 아래 화면을 밀어 내린다 */}
        <OfflineBanner />
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
          <Stack.Screen name="done/year" />
          <Stack.Screen
            name="share/[id]"
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="profile" />
          <Stack.Screen name="notifications" />
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
        {/* 팝업도 테마 변수 안에 둬야 테마색·바탕색을 따라간다 */}
        {/* showAlert 팝업 (기본 Alert 대신) */}
        <DialogHost />
        {/* 설치된 빌드가 너무 오래됐으면 스토어 업데이트 안내 */}
        <VersionGate />
      </View>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
