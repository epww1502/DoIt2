import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cn } from '@/lib/utils';

import { Text } from './Text';

export type ActionSheetItem = {
  label: string;
  /** 빨간 글씨 (내보내기·나가기 등) */
  destructive?: boolean;
  onPress: () => void;
};

type ActionSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** 맨 위 머리 부분 (사진·이름 등) */
  header?: ReactNode;
  items: ActionSheetItem[];
};

/** 아래에서 올라오는 선택지 시트. 항목을 누르면 시트를 닫고 그 동작을 한다 */
export function ActionSheet({
  visible,
  onClose,
  header,
  items,
}: ActionSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View className="flex-1 justify-end">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="닫기"
          onPress={onClose}
          className="absolute inset-0 bg-black/40"
        />
        <View
          className="gap-1 rounded-t-3xl bg-background px-3 pt-3"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <View className="mb-2 h-1 w-10 self-center rounded-full bg-border" />
          {header ? <View className="px-2 pb-3">{header}</View> : null}
          {items.map((item) => (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              onPress={() => {
                onClose();
                item.onPress();
              }}
              className="rounded-xl px-3 py-3.5 active:bg-accent"
            >
              <Text
                weight="600"
                size={16}
                className={cn(item.destructive && 'text-destructive')}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            className="mt-1 items-center rounded-xl py-3.5 bg-accent active:opacity-70"
          >
            <Text weight="600" size={16} className="text-muted-foreground">
              취소
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
