import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text } from '@/components/atoms';
import { TextArea } from '@/components/atoms/TextArea';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import type { ItemReview } from '@/lib/bucket/types';
import { useBucketStore } from '@/store/useBucketStore';

import { RATING_LABELS, StarRating } from './StarRating';
import { SheetPanel } from '@/components/atoms/SheetPanel';

type ReviewEditSheetProps = {
  itemId: string;
  /** 지금 내 평가 (열려 있을 때만 그린다) */
  review: ItemReview | null;
  onClose: () => void;
  /** 날짜·사진·쓴 돈까지 고치는 화면으로 */
  onOpenRecord: () => void;
};

/**
 * 공간 기록에서 내 별점·한 줄만 그 자리에서 고친다.
 * 사진은 건드리지 않는다 (saveMyReview는 사진을 안 넘기면 그대로 둔다)
 */
export function ReviewEditSheet({
  itemId,
  review,
  onClose,
  onOpenRecord,
}: ReviewEditSheetProps) {
  return (
    <Modal
      visible={Boolean(review)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {/* 열 때마다 지금 평가에서 다시 시작하려고 열려 있을 때만 그린다 */}
      {review ? (
        <SheetBody
          itemId={itemId}
          review={review}
          onClose={onClose}
          onOpenRecord={onOpenRecord}
        />
      ) : null}
    </Modal>
  );
}

function SheetBody({
  itemId,
  review,
  onClose,
  onOpenRecord,
}: ReviewEditSheetProps & { review: ItemReview }) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const saveMyReview = useBucketStore((s) => s.saveMyReview);
  const [rating, setRating] = useState(review.rating ?? 5);
  const [text, setText] = useState(review.review);

  const save = () => {
    saveMyReview(itemId, { rating, review: text.trim() });
    onClose();
  };

  return (
    <View className="flex-1 justify-end">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="닫기"
        onPress={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <SheetPanel onClose={onClose}>
        <View
          className="gap-4 rounded-t-3xl bg-background px-5 pt-3"
          style={{
            paddingBottom: (keyboardHeight || insets.bottom) + 12,
          }}
        >
          <View className="h-1 w-10 self-center rounded-full bg-border" />
          <Text weight="700" size={18}>
            내 평가 고치기
          </Text>
          <View className="items-center gap-2">
            <StarRating value={rating} onChange={setRating} size={36} />
            <Text weight="600" className="text-primary">
              {RATING_LABELS[rating]}
            </Text>
          </View>
          <TextArea
            value={text}
            onChangeText={setText}
            placeholder="오늘의 한 줄을 남겨봐요"
            maxLength={200}
            autoFocus={!review.review}
          />
          <Button label="저장" size="md" onPress={save} />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onClose();
              onOpenRecord();
            }}
            hitSlop={8}
            className="self-center active:opacity-60"
          >
            <Text size={13} className="text-muted-foreground">
              내 사진이나 날짜도 고치려면 · 함께한 기록 수정
            </Text>
          </Pressable>
        </View>
      </SheetPanel>
    </View>
  );
}
