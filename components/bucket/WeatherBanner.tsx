import { Linking, Pressable, View } from 'react-native';

import { Text } from '@/components/atoms';
import type { WeatherState } from '@/hooks/useTodayWeather';

type WeatherBannerProps = {
  /** 내 위치 날씨 */
  state: WeatherState;
  onReload: () => void;
  /** 내 위치나 장소 중 어디든 비 때문에 실외를 빼야 하는지 */
  rainMatters: boolean;
  /** '실외 포함'이 켜져 있는지 (스위치는 화면에 따로 있다) */
  includeOutdoor: boolean;
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

/** 비 때문에 실외를 어떻게 하는지 한 줄 (장소 날씨까지 반영된 결과) */
function rainDetail(
  rainMatters: boolean,
  includeOutdoor: boolean,
  excludedCount: number
) {
  if (!rainMatters) return '실외도 좋은 날이에요';
  if (includeOutdoor) return '실외도 같이 뽑아요';
  return excludedCount > 0
    ? `비 오는 곳의 실외 ${excludedCount}개 빼고 뽑아요`
    : // 후보(필터·이미 해본 것 포함 여부)에 실외가 없으면 뺄 것도 없다고 알려준다
      '지금 후보엔 실외가 없어요';
}

/** '오늘 뭐 하지' 위의 오늘 날씨 안내 (제목은 내 위치 날씨) */
export function WeatherBanner({
  state,
  onReload,
  rainMatters,
  includeOutdoor,
  excludedCount,
}: WeatherBannerProps) {
  let title: string;
  let detail: string | null = null;
  let action: React.ReactNode = null;

  switch (state.status) {
    case 'loading':
      title = '🌡️ 오늘 날씨를 확인하고 있어요';
      break;
    case 'denied':
      title = '📍 위치 권한이 없어서 내 위치 날씨는 못 봤어요';
      // 장소 좌표가 있는 항목은 권한 없이도 그 장소 날씨로 판단한다
      detail = rainMatters
        ? rainDetail(rainMatters, includeOutdoor, excludedCount)
        : '장소를 고른 항목은 그 장소 날씨로 판단해요';
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
      title = `${weather.emoji} 오늘 ${weather.summary} · 비 올 확률 ${weather.rainChance}%`;
      detail = rainDetail(rainMatters, includeOutdoor, excludedCount);
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
