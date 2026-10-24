import { Tabs } from 'expo-router';
import { PlatformPressable } from 'expo-router/react-navigation';
import {
  CircleCheck,
  Dices,
  ListChecks,
  Settings,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, type ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTogether } from '@/hooks/useTogether';
import { themeColors } from '@/constants/colors';
import { FONT_WEIGHTS } from '@/constants/fonts';
import { useThemeMode } from '@/contexts/ThemeModeContext';
import { usePrimaryColor } from '@/store/useSettingsStore';

/** 아이콘이 살짝 줄었다가 통 튀어 돌아오는 스프링 */
const BOUNCE_SPRING = { damping: 7, stiffness: 320, mass: 0.6 };

/** 탭 아이콘: 고를 때마다 아이콘만 통 튄다 */
function tabIcon(Icon: LucideIcon) {
  function TabIcon({
    color,
    focused,
  }: {
    color: ColorValue;
    focused: boolean;
  }) {
    const scale = useSharedValue(1);
    const style = useAnimatedStyle(() => ({
      transform: [{ scale: scale.get() }],
    }));

    useEffect(() => {
      if (!focused) return;
      scale.set(
        withSequence(
          withTiming(0.8, { duration: 80 }),
          withSpring(1, BOUNCE_SPRING)
        )
      );
    }, [focused, scale]);

    return (
      <Animated.View style={style}>
        <Icon size={22} color={typeof color === 'string' ? color : undefined} />
      </Animated.View>
    );
  }
  return TabIcon;
}

/** 탭 버튼: 누를 때 뒤가 하얗게 번지는 효과(물결·흐려짐)를 없앤다 */
function TabButton(props: ComponentProps<typeof PlatformPressable>) {
  return (
    <PlatformPressable
      {...props}
      android_ripple={{ color: 'transparent' }}
      pressColor="transparent"
      pressOpacity={1}
    />
  );
}

export default function TabLayout() {
  const { colorScheme } = useThemeMode();
  const theme = themeColors[colorScheme];
  const primary = usePrimaryColor();
  const together = useTogether();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: primary,
        tabBarInactiveTintColor: theme.mutedForeground,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
        },
        tabBarLabelStyle: { fontFamily: FONT_WEIGHTS['500'], fontSize: 11 },
        tabBarButton: (props) => <TabButton {...props} />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: '버킷리스트', tabBarIcon: tabIcon(ListChecks) }}
      />
      <Tabs.Screen
        name="done"
        options={{
          title: together ? '함께한 것' : '해낸 것',
          tabBarIcon: tabIcon(CircleCheck),
        }}
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
