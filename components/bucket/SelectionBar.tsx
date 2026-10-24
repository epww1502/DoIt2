import { Pressable, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';

import { Button, Text } from '@/components/atoms';

type SelectionHeaderProps = {
  count: number;
  allSelected: boolean;
  onCancel: () => void;
  onToggleAll: () => void;
};

/** 고르기 모드일 때 화면 위 제목 대신 보이는 줄 */
export function SelectionHeader({
  count,
  allSelected,
  onCancel,
  onToggleAll,
}: SelectionHeaderProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(120)}
      className="h-[52px] flex-row items-center justify-between px-5"
    >
      <Pressable accessibilityRole="button" hitSlop={8} onPress={onCancel}>
        <Text weight="600" size={15} className="text-muted-foreground">
          취소
        </Text>
      </Pressable>
      <Text weight="700" size={17}>
        {count}개 선택
      </Text>
      <Pressable accessibilityRole="button" hitSlop={8} onPress={onToggleAll}>
        <Text weight="600" size={15} className="text-primary">
          {allSelected ? '선택 해제' : '전체 선택'}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/** 고르기 모드일 때 아래에서 올라오는 지우기 버튼 */
export function SelectionDeleteBar({
  count,
  onDelete,
}: {
  count: number;
  onDelete: () => void;
}) {
  return (
    <Animated.View
      entering={SlideInDown.springify().damping(14)}
      exiting={SlideOutDown.duration(150)}
      className="absolute bottom-0 left-0 right-0 border-t px-5 pb-4 pt-3 bg-background border-border"
    >
      <View>
        <Button
          label={`${count}개 지우기`}
          variant="destructive"
          onPress={onDelete}
        />
      </View>
    </Animated.View>
  );
}
