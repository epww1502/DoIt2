import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/atoms';

type ScreenHeaderProps = {
  title: string;
  subtitle: string;
  right?: ReactNode;
};

/** 탭 화면 상단의 큰 제목 */
export function ScreenHeader({ title, subtitle, right }: ScreenHeaderProps) {
  return (
    <View className="flex-row items-end justify-between px-5 pb-4 pt-3">
      <View className="flex-1 gap-1">
        <Text weight="700" size={26}>
          {title}
        </Text>
        <Text variant="muted">{subtitle}</Text>
      </View>
      {right}
    </View>
  );
}
