import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { isWeb } from '@/constants/api';
import { useColorScheme as useRNSystemColorScheme } from 'react-native';
import { colorScheme as cssInteropColorScheme } from 'react-native-css-interop';
import { isDarkMode } from '@/lib/utils';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedColorScheme = 'light' | 'dark';

const THEME_MODE_STORAGE_KEY = 'glab.theme.mode';
const THEME_MODES = new Set<ThemeMode>(['system', 'light', 'dark']);

const HAS_WINDOW = typeof window !== 'undefined';
const IS_WEB_RUNTIME = isWeb && HAS_WINDOW;

type ThemeModeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  colorScheme: ResolvedColorScheme;
  systemColorScheme: ResolvedColorScheme;
  isLoaded: boolean;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && THEME_MODES.has(value as ThemeMode);
}

function coerceThemeMode(value: unknown): ThemeMode {
  return isThemeMode(value) ? value : 'system';
}

function readStoredThemeMode(): ThemeMode | null {
  if (!IS_WEB_RUNTIME) return null;
  try {
    return coerceThemeMode(window.localStorage.getItem(THEME_MODE_STORAGE_KEY));
  } catch {
    return null;
  }
}

function persistThemeMode(mode: ThemeMode) {
  if (IS_WEB_RUNTIME) {
    try {
      window.localStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
    } catch {
      // ignore
    }
    return;
  }

  void AsyncStorage.setItem(THEME_MODE_STORAGE_KEY, mode).catch(() => {});
}

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useHydratedSystemColorScheme();

  const [mode, setModeState] = useState<ThemeMode>(() => {
    return readStoredThemeMode() ?? 'system';
  });

  const [isLoaded, setIsLoaded] = useState(() => IS_WEB_RUNTIME);

  useEffect(() => {
    if (isWeb) return;

    let isMounted = true;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_MODE_STORAGE_KEY);
        if (!isMounted) return;
        setModeState(coerceThemeMode(saved));
      } catch {
        // ignore
      } finally {
        if (isMounted) setIsLoaded(true);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    persistThemeMode(next);
  }, []);

  const colorScheme: ResolvedColorScheme =
    mode === 'system' ? systemColorScheme : mode;

  // Native: `dark:` 반영을 위해 css-interop colorScheme과 동기화.
  // nativewind의 useColorScheme().setColorScheme은 darkMode 플래그 미주입 시 throw 하므로
  // 동일 런타임인 react-native-css-interop의 colorScheme.set을 사용한다.
  const nativeWindSync = isWeb ? null : (
    <NativeWindColorSchemeSync mode={mode} />
  );

  // 웹은 Tailwind darkMode: 'class'라서 html에 .dark 토글이 필요
  useEffect(() => {
    if (!isWeb) return;
    const root = document.documentElement;
    root.classList.toggle('dark', isDarkMode(colorScheme));
  }, [colorScheme]);

  const value = useMemo<ThemeModeContextValue>(() => {
    return {
      mode,
      setMode,
      colorScheme,
      systemColorScheme,
      isLoaded,
    };
  }, [mode, setMode, colorScheme, systemColorScheme, isLoaded]);

  return (
    <ThemeModeContext.Provider value={value}>
      {nativeWindSync}
      {children}
    </ThemeModeContext.Provider>
  );
}

function useHydratedSystemColorScheme(): ResolvedColorScheme {
  // 앱 전용이라 웹 hydration 보정 없이 시스템 테마를 그대로 쓴다.
  return (useRNSystemColorScheme() ?? 'light') as ResolvedColorScheme;
}

function NativeWindColorSchemeSync({ mode }: { mode: ThemeMode }) {
  useEffect(() => {
    cssInteropColorScheme.set(mode);
  }, [mode]);

  return null;
}

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) {
    throw new Error('useThemeMode must be used within ThemeModeProvider');
  }
  return ctx;
}
