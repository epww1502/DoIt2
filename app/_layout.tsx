import { Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import 'react-native-reanimated';
import '../global.css';
import '@/lib/date';

import { CoupleSync } from '@/components/sync/CoupleSync';
import { NAV_THEME } from '@/constants/theme';
import { ThemeModeProvider, useThemeMode } from '@/contexts/ThemeModeContext';
import { useFontsLoader } from '@/hooks/useFontsLoader';
import { useBucketStoreHydrated } from '@/store/useBucketStore';

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

  if ((!fontsLoaded && !fontError) || !hydrated) {
    return null;
  }

  return (
    <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
      {/* 로그인·커플 확인·실시간 동기화 (화면 없음) */}
      <CoupleSync />
      <View className="flex-1 bg-background">
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
          <Stack.Screen name="couple" />
        </Stack>
      </View>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
