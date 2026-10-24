import { Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { vars } from 'nativewind';
import { useMemo } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';
import '../global.css';
import '@/lib/date';

import { DialogHost } from '@/components/atoms/DialogHost';
import { PushSync } from '@/components/sync/PushSync';
import { SpaceSync } from '@/components/sync/SpaceSync';
import { hexToRgbTriple } from '@/constants/palettes';
import { NAV_THEME } from '@/constants/theme';
import { ThemeModeProvider, useThemeMode } from '@/contexts/ThemeModeContext';
import { useFontsLoader } from '@/hooks/useFontsLoader';
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
  // 설정에서 고른 테마색을 CSS 변수로 깔아서 bg-primary·text-primary 등이 모두 따라 바뀌게 한다
  const themeVars = useMemo(
    () => vars({ '--color-primary': hexToRgbTriple(primary) }),
    [primary]
  );

  if ((!fontsLoaded && !fontError) || !hydrated) {
    return null;
  }

  return (
    <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
      {/* 로그인·공간 확인·실시간 동기화 (화면 없음) */}
      <SpaceSync />
      {/* 알림 등록·알림 눌러 열기 (화면 없음) */}
      <PushSync />
      {/* showAlert 팝업 (기본 Alert 대신) */}
      <DialogHost />
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
