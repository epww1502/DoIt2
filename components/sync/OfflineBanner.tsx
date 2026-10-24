import { CloudOff, RefreshCw } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Text } from '@/components/atoms';
import { useThemeMode } from '@/contexts/ThemeModeContext';
import { useConnectionStore } from '@/lib/connection';
import { usePendingCount } from '@/store/useOutboxStore';

/** "다시 연결됐어요"를 보여주는 시간 */
const BACK_MS = 2500;

const COLORS = {
  offline: {
    light: { bg: '#FFF3D6', fg: '#7A5A00' },
    dark: { bg: '#3D3216', fg: '#FFD978' },
  },
  back: {
    light: { bg: '#E3F6E8', fg: '#1F7A3D' },
    dark: { bg: '#173322', fg: '#7FE0A0' },
  },
};

/**
 * 화면 맨 위(상태 표시줄 자리 포함)에 붙는 연결 안내 띠.
 * 띠가 공간을 차지해서 아래 화면이 내려간다 (각 화면의 SafeAreaView는 겹치는 만큼만 여백을 준다).
 * - 오프라인: "인터넷에 연결되지 않았어요" + 저장 대기 개수
 * - 다시 연결되면 잠깐 "다시 연결됐어요"
 */
export function OfflineBanner() {
  const online = useConnectionStore((s) => s.online);
  const reconnectedAt = useConnectionStore((s) => s.reconnectedAt);
  const pending = usePendingCount();
  const { colorScheme } = useThemeMode();
  const insets = useSafeAreaInsets();
  // "다시 연결됐어요"를 다 보여준 연결 시각
  const [shownFor, setShownFor] = useState<number | null>(null);
  const showBack = reconnectedAt !== null && shownFor !== reconnectedAt;

  useEffect(() => {
    if (reconnectedAt === null) return;
    const timer = setTimeout(() => setShownFor(reconnectedAt), BACK_MS);
    return () => clearTimeout(timer);
  }, [reconnectedAt]);

  if (online && !showBack) return null;

  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const { bg, fg } = (online ? COLORS.back : COLORS.offline)[scheme];
  const title = online ? '다시 연결됐어요' : '인터넷에 연결되지 않았어요';
  const detail = online
    ? pending > 0
      ? '바꾼 내용을 저장하는 중이에요'
      : '바꾼 내용도 모두 저장했어요'
    : pending > 0
      ? `바꾼 내용 ${pending}개는 연결되면 저장돼요`
      : '연결되면 자동으로 다시 이어져요';

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{ backgroundColor: bg, paddingTop: insets.top }}
      className="px-5 pb-2.5"
    >
      <View className="flex-row items-center gap-2 pt-1.5">
        <Icon as={online ? RefreshCw : CloudOff} size={16} color={fg} />
        <Text weight="600" size={13} style={{ color: fg }}>
          {title}
        </Text>
        <Text
          size={12}
          className="flex-1"
          style={{ color: fg, opacity: 0.85 }}
          numberOfLines={1}
        >
          · {detail}
        </Text>
      </View>
    </View>
  );
}
