import * as Updates from 'expo-updates';
import { Sparkles, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Text } from '@/components/atoms';
import { SOFT_SHADOW } from '@/constants/shadow';
import { RELOAD_OPTIONS } from '@/hooks/useStartupUpdate';

/**
 * 탭바(알약 62 + 위아래 여백 16) 바로 위에 띄우는 높이.
 * ponytail: 탭 밖 화면에서도 같은 높이에 뜬다. 거슬리면 화면별 아래 여백을 받아 쓴다.
 */
const ABOVE_TAB_BAR = 86;

/**
 * 새 버전(OTA)을 다 받아 두면 화면 아래에 '다시 시작' 띠를 띄운다 (루트 레이아웃에 한 번).
 * 닫으면 이번 실행 동안은 다시 뜨지 않고, 받은 버전은 다음에 켤 때 저절로 적용된다.
 */
export function UpdateReadyBanner() {
  const { isUpdatePending, downloadedUpdate } = Updates.useUpdates();
  const insets = useSafeAreaInsets();
  const [closedFor, setClosedFor] = useState<string | null>(null);
  const id = downloadedUpdate?.updateId ?? null;

  if (__DEV__ || !isUpdatePending || closedFor === id) return null;

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-4"
      style={{ bottom: insets.bottom + ABOVE_TAB_BAR }}
    >
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        className="flex-row items-center gap-2 rounded-full bg-card py-2 pl-4 pr-2"
        style={SOFT_SHADOW}
      >
        <Icon as={Sparkles} size={16} className="text-primary" />
        <Text weight="600" size={14} className="flex-1" numberOfLines={1}>
          새 버전이 준비됐어요
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void Updates.reloadAsync(RELOAD_OPTIONS)}
          className="h-9 justify-center rounded-full bg-primary px-4"
        >
          <Text weight="600" size={13} className="text-primary-foreground">
            다시 시작
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="닫기"
          hitSlop={8}
          onPress={() => setClosedFor(id)}
          className="h-9 w-9 items-center justify-center"
        >
          <Icon as={X} size={16} className="text-muted-foreground" />
        </Pressable>
      </View>
    </View>
  );
}
