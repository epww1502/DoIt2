import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/atoms';

type ScreenHeaderProps = {
  title: string;
  subtitle: string;
  /** 제목과 같은 줄 오른쪽에 놓는 작은 요소 (공간 바꾸기 버튼 등) */
  right?: ReactNode;
};

/** 탭 화면 상단의 큰 제목 */
export function ScreenHeader({ title, subtitle, right }: ScreenHeaderProps) {
  return (
    <View className="gap-1 px-5 pb-4 pt-3">
      <View className="flex-row items-center gap-3">
        {/* 제목은 남는 폭만 쓰고, 넘치면 말줄임 */}
        <Text weight="700" size={26} numberOfLines={1} className="flex-1">
          {title}
        </Text>
        {right ? <View className="shrink-0">{right}</View> : null}
      </View>
      <Text variant="muted">{subtitle}</Text>
    </View>
  );
}
