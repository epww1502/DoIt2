import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import {
  Dices,
  ListChecks,
  CircleCheck,
  Settings,
  type LucideIcon,
} from 'lucide-react-native';

import { colors, themeColors } from '@/constants/colors';
import { FONT_WEIGHTS } from '@/constants/fonts';
import { useThemeMode } from '@/contexts/ThemeModeContext';

function tabIcon(Icon: LucideIcon) {
  function TabIcon({ color }: { color: ColorValue }) {
    return (
      <Icon size={22} color={typeof color === 'string' ? color : undefined} />
    );
  }
  return TabIcon;
}

export default function TabLayout() {
  const { colorScheme } = useThemeMode();
  const theme = themeColors[colorScheme];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: theme.mutedForeground,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
        },
        tabBarLabelStyle: { fontFamily: FONT_WEIGHTS['500'], fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: '버킷리스트', tabBarIcon: tabIcon(ListChecks) }}
      />
      <Tabs.Screen
        name="done"
        options={{ title: '함께한 것', tabBarIcon: tabIcon(CircleCheck) }}
      />
      <Tabs.Screen
        name="pick"
        options={{ title: '오늘 뭐 하지', tabBarIcon: tabIcon(Dices) }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: '설정', tabBarIcon: tabIcon(Settings) }}
      />
    </Tabs>
  );
}
