import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon, Text } from '@/components/atoms';
import { getCategory, KIND_META, type BucketItem } from '@/lib/bucket/types';

import { Selectable } from './Selectable';

export type SelectionProps = {
  selecting: boolean;
  selected: boolean;
  /** 목록에서의 순서 (고르기 모드가 켜질 때 차례로 튀게) */
  index: number;
  onLongPress: () => void;
  onToggle: () => void;
};

/** 버킷리스트 목록의 한 줄. 길게 누르면 여러 개 고르기 */
export function BucketRow({
  item,
  ...selection
}: { item: BucketItem } & SelectionProps) {
  const category = getCategory(item.category);
  const meta = [KIND_META[item.kind].label, category.label, item.location]
    .filter(Boolean)
    .join(' · ');

  return (
    <Selectable
      {...selection}
      onPress={() =>
        router.push({ pathname: '/item/[id]', params: { id: item.id } })
      }
      className="flex-row items-center gap-3 rounded-2xl border p-4 bg-card border-border active:opacity-70"
    >
      <View className="h-12 w-12 items-center justify-center rounded-full bg-accent">
        <Text size={22}>{category.emoji}</Text>
      </View>
      <View className="flex-1 gap-0.5 pr-6">
        <Text weight="600" size={16} numberOfLines={1}>
          {item.title}
        </Text>
        <Text variant="muted" size={13} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      {/* 고르기 모드에서는 체크 동그라미가 그 자리에 나온다 */}
      {!selection.selecting ? (
        <Icon as={ChevronRight} size={20} className="text-muted-foreground" />
      ) : null}
    </Selectable>
  );
}
