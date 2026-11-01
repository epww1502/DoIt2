import { Tabs } from 'expo-router';
import { PlatformPressable } from 'expo-router/react-navigation';
import { CircleCheck, ListChecks, Settings } from 'lucide-react-native';
import { useEffect, type ComponentProps, type ComponentType } from 'react';
import { View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { PlateDiceIcon } from '@/components/bucket/PlateDiceIcon';
import { useSurface } from '@/hooks/useSurface';
import { TabBarSpaceContext } from '@/hooks/useTabBarSpace';
import { themeColors } from '@/constants/colors';
import { FONT_WEIGHTS } from '@/constants/fonts';
import { SOFT_SHADOW } from '@/constants/shadow';
import { useThemeMode } from '@/contexts/ThemeModeContext';
import { usePrimaryColor } from '@/store/useSettingsStore';

/** 고른 탭 동그라미 지름 */
const TAB_CIRCLE = 34;
/** 떠 있는 알약 탭바 높이와 화면 가장자리·위쪽 여백 */
const PILL_HEIGHT = 62;
const PILL_SIDE = 16;
const PILL_TOP = 8;
/** 알약 안쪽에서 양 끝 탭까지 띄우는 여백 */
const PILL_INSET = 14;

/** 아이콘이 살짝 줄었다가 통 튀어 돌아오는 스프링 */
const BOUNCE_SPRING = { damping: 7, stiffness: 320, mass: 0.6 };

/** 탭 아이콘으로 쓸 수 있는 모양 (lucide 아이콘 또는 직접 그린 아이콘) */
type TabIconComponent = ComponentType<{
  size?: number;
  color?: string;
  /** 직접 그린 아이콘이 겹친 부분을 가릴 때 칠하는 바탕색 */
  cutout?: string;
}>;

/** 탭 아이콘: 고를 때마다 아이콘만 통 튄다 */
function tabIcon(Icon: TabIconComponent) {
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

    const primary = usePrimaryColor();
    const surface = useSurface();
    const iconColor = focused
      ? '#FFFFFF'
      : typeof color === 'string'
        ? color
        : undefined;
    // 직접 그린 아이콘(주사위)만 바탕색을 알려준다. lucide 아이콘에는 넘기지 않는다
    const cutout =
      Icon === PlateDiceIcon
        ? { cutout: focused ? primary : surface.card }
        : {};
    return (
      // 고른 탭은 테마색 동그라미 안에 흰 아이콘
      <Animated.View
        style={[
          {
            width: TAB_CIRCLE,
            height: TAB_CIRCLE,
            borderRadius: TAB_CIRCLE / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: focused ? primary : 'transparent',
          },
          style,
        ]}
      >
        <Icon size={19} color={iconColor} {...cutout} />
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
  const insets = useSafeAreaInsets();
  const surface = useSurface();
  const barHeight = PILL_TOP * 2 + PILL_HEIGHT + insets.bottom;

  return (
    <TabBarSpaceContext.Provider value={barHeight}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: primary,
          tabBarInactiveTintColor: theme.mutedForeground,
          // 화면 위에 떠 있는 알약 모양 탭바. 뒤에 바탕 띠 없이 내용이 비쳐 보인다.
          // 탭 화면은 useTabBarSpace()만큼 아래를 띄워 탭바에 가리지 않게 한다.
          // 고른 탭은 아이콘이 테마색 동그라미 안에 들어간다
          tabBarShowLabel: true,
          tabBarStyle: {
            position: 'absolute',
            height: barHeight,
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            // 탭들을 알약 안쪽으로 모아서 양 끝 아이콘이 가장자리에 붙지 않게
            paddingHorizontal: PILL_SIDE + PILL_INSET,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarItemStyle: {
            height: PILL_HEIGHT,
            marginTop: PILL_TOP,
            paddingTop: 5,
            paddingBottom: 6,
          },
          tabBarIconStyle: { width: TAB_CIRCLE, height: TAB_CIRCLE },
          tabBarBackground: () => (
            <View
              style={[
                {
                  position: 'absolute',
                  left: PILL_SIDE,
                  right: PILL_SIDE,
                  top: PILL_TOP,
                  height: PILL_HEIGHT,
                  borderRadius: PILL_HEIGHT / 2,
                  borderWidth: 1,
                  backgroundColor: surface.card,
                  borderColor: surface.border,
                },
                SOFT_SHADOW,
              ]}
            />
          ),
          tabBarLabelStyle: {
            fontFamily: FONT_WEIGHTS['600'],
            fontSize: 11,
            marginTop: 1,
          },
          tabBarButton: (props) => <TabButton {...props} />,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: '목록', tabBarIcon: tabIcon(ListChecks) }}
        />
        <Tabs.Screen
          name="done"
          options={{
            title: '일지',
            tabBarIcon: tabIcon(CircleCheck),
          }}
        />
        <Tabs.Screen
          name="pick"
          options={{
            title: '추천',
            tabBarIcon: tabIcon(PlateDiceIcon),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{ title: '설정', tabBarIcon: tabIcon(Settings) }}
        />
      </Tabs>
    </TabBarSpaceContext.Provider>
  );
}
