import { Pressable, View } from 'react-native';

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
    <View className="h-[52px] flex-row items-center justify-between px-5">
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
    </View>
  );
}

/** 고르기 모드일 때 아래에서 올라오는 지우기 버튼 */
export function SelectionDeleteBar({
  count,
  onDelete,
  label,
  secondaryLabel,
  onSecondary,
}: {
  count: number;
  onDelete: () => void;
  /** 버튼 글자 (기본: 'N개 지우기') */
  label?: string;
  /** 왼쪽에 하나 더 두는 버튼 (예: 공유하기) */
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <View className="absolute bottom-0 left-0 right-0 border-t px-5 pb-4 pt-3 bg-background border-border">
      <View className="flex-row gap-2">
        {secondaryLabel && onSecondary ? (
          <Button
            label={secondaryLabel}
            variant="outline"
            onPress={onSecondary}
            className="flex-1"
          />
        ) : null}
        <Button
          label={label ?? `${count}개 지우기`}
          variant="destructive"
          onPress={onDelete}
          className="flex-1"
        />
      </View>
    </View>
  );
}
