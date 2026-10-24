// SDK 58부터 네비게이션 테마는 expo-router에서 가져온다.
import { DarkTheme, DefaultTheme } from 'expo-router';
import { colors, themeColors } from '@/constants/colors';

type Theme = typeof DefaultTheme;

export const Colors = {
  light: {
    text: themeColors.light.foreground,
    background: themeColors.light.background,
    homebg: themeColors.light.homebg,
    tint: themeColors.light.primary,
    icon: colors.gray[300],
    tabIconDefault: colors.gray[300],
    tabIconSelected: themeColors.light.primary,
    borderColor: themeColors.light.border,
    tabBarBorderColor: themeColors.light.border,
  },
  dark: {
    text: themeColors.dark.foreground,
    background: themeColors.dark.background,
    homebg: themeColors.dark.homebg,
    tint: themeColors.dark.primary,
    icon: colors.gray[400],
    tabIconDefault: colors.gray[400],
    tabIconSelected: themeColors.dark.primary,
    borderColor: themeColors.dark.border,
    tabBarBorderColor: themeColors.dark.border,
  },
};

export const NAV_THEME: Record<'light' | 'dark', Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: Colors.light.background,
      border: Colors.light.borderColor,
      text: Colors.light.text,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: Colors.dark.background,
      border: Colors.dark.borderColor,
      text: Colors.dark.text,
    },
  },
};
