import { Linking, Pressable, Switch, View } from 'react-native';

import { Text } from '@/components/atoms';
import { colors, themeColors } from '@/constants/colors';
import { useThemeMode } from '@/contexts/ThemeModeContext';
import type { WeatherState } from '@/hooks/useTodayWeather';

type WeatherBannerProps = {
  state: WeatherState;
  onReload: () => void;
  /** 비 오는 날 실외도 뽑을지 */
  includeOutdoor: boolean;
  onChangeIncludeOutdoor: (value: boolean) => void;
  /** 비 때문에 빠진 실외 항목 수 */
  excludedCount: number;
};

function ActionText({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" hitSlop={8} onPress={onPress}>
      <Text weight="600" size={13} className="text-primary">
        {label}
      </Text>
    </Pressable>
  );
}

/** '오늘 뭐 하지' 위의 오늘 날씨 안내 */
export function WeatherBanner({
  state,
  onReload,
  includeOutdoor,
  onChangeIncludeOutdoor,
  excludedCount,
}: WeatherBannerProps) {
  const { colorScheme } = useThemeMode();

  let title: string;
  let detail: string | null = null;
  let action: React.ReactNode = null;

  switch (state.status) {
    case 'loading':
      title = '🌡️ 오늘 날씨를 확인하고 있어요';
      break;
    case 'denied':
      title = '📍 위치 권한이 없어서 날씨를 못 봤어요';
      detail = '허용하면 비 오는 날 실외 데이트를 빼고 뽑아드려요';
      action = (
        <ActionText label="설정 열기" onPress={() => Linking.openSettings()} />
      );
      break;
    case 'error':
      title = '🌡️ 날씨를 불러오지 못했어요';
      action = <ActionText label="다시 시도" onPress={onReload} />;
      break;
    case 'ready': {
      const { weather } = state;
      title = `${weather.emoji} 오늘 ${weather.summary} · 강수확률 ${weather.rainChance}%`;
      if (!weather.isRainy) {
        detail = '실외 데이트하기 좋은 날이에요';
      } else if (includeOutdoor) {
        detail = '비 소식이 있지만 실외도 같이 뽑아요';
      } else {
        detail =
          excludedCount > 0
            ? `비 소식이 있어서 실외 ${excludedCount}개는 빼고 뽑을게요 ☔`
            : '비 소식이 있어서 실외는 빼고 뽑을게요 ☔';
      }
      if (weather.isRainy) {
        action = (
          <View className="flex-row items-center gap-2">
            <Text size={12} className="text-muted-foreground">
              실외도 포함
            </Text>
            <Switch
              accessibilityLabel="비 와도 실외 포함해서 뽑기"
              value={includeOutdoor}
              onValueChange={onChangeIncludeOutdoor}
              trackColor={{
                false: themeColors[colorScheme].input,
                true: colors.primary,
              }}
              thumbColor={colors.white}
            />
          </View>
        );
      }
      break;
    }
  }

  return (
    <View className="mx-5 mb-4 flex-row items-center gap-3 rounded-2xl px-4 py-3 bg-accent">
      <View className="flex-1 gap-0.5">
        <Text weight="600" size={14}>
          {title}
        </Text>
        {detail ? (
          <Text size={12} className="text-muted-foreground">
            {detail}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}
