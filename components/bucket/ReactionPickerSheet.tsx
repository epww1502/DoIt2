import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/atoms';
import { SheetPanel } from '@/components/atoms/SheetPanel';
import { REACTION_EMOJIS, type ReactionEmoji } from '@/lib/bucket/reactions';
import { cn } from '@/lib/utils';

type ReactionPickerSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** 이미 내가 남긴 반응인지 (동그라미로 표시하고, 누르면 뺀다) */
  isMine: (emoji: ReactionEmoji) => boolean;
  onPick: (emoji: ReactionEmoji) => void;
};

/** 이모지 반응 전체에서 고르는 시트. 하나 누르면 닫고 남기거나 뺀다 */
export function ReactionPickerSheet({
  visible,
  onClose,
  isMine,
  onPick,
}: ReactionPickerSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
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
        {/* 안에 스크롤 목록이 있어서 위쪽 손잡이 부분만 끌어 내려 닫는다 */}
        <SheetPanel onClose={onClose} handleOnly style={{ maxHeight: '70%' }}>
          <View
            className="shrink rounded-t-3xl bg-background px-3 pt-3"
            style={{ paddingBottom: insets.bottom + 12 }}
          >
            <View className="mb-3 h-1 w-10 self-center rounded-full bg-border" />
            <Text weight="700" size={17} className="px-2 pb-2">
              반응 고르기
            </Text>
            <ScrollView contentContainerClassName="flex-row flex-wrap pb-2">
              {REACTION_EMOJIS.map((emoji) => {
                const mine = isMine(emoji);
                return (
                  // 한 줄에 7개
                  <View key={emoji} className="w-[14.28%] items-center py-1">
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${emoji} ${mine ? '빼기' : '남기기'}`}
                      onPress={() => onPick(emoji)}
                      className={cn(
                        'h-11 w-11 items-center justify-center rounded-full active:opacity-70',
                        mine && 'bg-accent'
                      )}
                    >
                      <Text size={26}>{emoji}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </SheetPanel>
      </View>
    </Modal>
  );
}
