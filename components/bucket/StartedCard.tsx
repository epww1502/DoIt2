import dayjs from 'dayjs';
import { Play } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Icon, Text } from '@/components/atoms';
import { DatePickerSheet } from '@/components/bucket/DatePickerSheet';
import { dayCount, type BucketItem } from '@/lib/bucket/types';
import { showAlert } from '@/lib/dialog';
import { todayKey } from '@/lib/date';
import { useBucketStore } from '@/store/useBucketStore';

/** 항목 화면: 진행 중이면 며칠째인지와 시작일 바꾸기·시작 취소 */
export function StartedCard({ item }: { item: BucketItem }) {
  const updateItem = useBucketStore((s) => s.updateItem);
  const [pickerOpen, setPickerOpen] = useState(false);
  const started = item.started;
  if (!started || item.done) return null;

  const days = dayCount(started.date, todayKey());
  const cancel = () =>
    showAlert(
      '시작을 취소할까요?',
      '진행 중 표시가 사라지고 시작 전으로 돌아가요.',
      [
        { text: '닫기', style: 'cancel' },
        {
          text: '시작 취소',
          style: 'destructive',
          onPress: () => updateItem(item.id, { started: null }),
        },
      ]
    );

  return (
    <View className="flex-row items-center gap-3 rounded-2xl p-4 bg-accent">
      <Icon as={Play} size={18} className="text-primary" />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="시작한 날 바꾸기"
        onPress={() => setPickerOpen(true)}
        className="flex-1 gap-0.5 active:opacity-70"
      >
        <Text weight="600" size={15}>
          진행 중 · {Math.max(days, 1)}일째
        </Text>
        <Text variant="muted" size={12}>
          {dayjs(started.date).format('YYYY년 M월 D일')}에 시작했어요 · 날짜
          바꾸기
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        hitSlop={6}
        onPress={cancel}
        className="rounded-full bg-background px-3 py-1.5 active:opacity-70"
      >
        <Text weight="600" size={12} className="text-muted-foreground">
          시작 취소
        </Text>
      </Pressable>

      <DatePickerSheet
        visible={pickerOpen}
        value={started.date}
        onChange={(date) => updateItem(item.id, { started: { date } })}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}
