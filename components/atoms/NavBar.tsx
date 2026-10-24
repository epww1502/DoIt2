import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from './Icon';
import { Text } from './Text';

type NavBarProps = {
  title?: string;
  onBack?: () => void;
  /** 오른쪽 버튼 영역 */
  right?: ReactNode;
};

/** 뒤로가기 + 가운데 제목 (높이 52) */
export function NavBar({ title, onBack, right }: NavBarProps) {
  return (
    <View className="h-[52px] flex-row items-center px-3">
      <View className="w-20 flex-row">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
          hitSlop={8}
          onPress={onBack ?? (() => router.back())}
          className="h-10 w-10 items-center justify-center"
        >
          <Icon as={ChevronLeft} size={24} />
        </Pressable>
      </View>
      <View className="flex-1 items-center">
        {title ? (
          <Text weight="600" size={16} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
      </View>
      <View className="h-10 w-20 flex-row items-center justify-end">
        {right}
      </View>
    </View>
  );
}
