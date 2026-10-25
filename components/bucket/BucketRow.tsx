import { router } from 'expo-router';
import { ChevronRight, MessageCircle } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon, Text } from '@/components/atoms';
import {
  getCategory,
  KIND_META,
  settingTag,
  type BucketItem,
} from '@/lib/bucket/types';

import { cn } from '@/lib/utils';

import { goalDday, goalPassed } from './goalDday';
import { Selectable } from './Selectable';

export type SelectionProps = {
  selecting: boolean;
  selected: boolean;
  onLongPress: () => void;
  onToggle: () => void;
};

/** 버킷리스트 목록의 한 줄. 길게 누르면 여러 개 고르기 */
export function BucketRow({
  item,
  ...selection
}: { item: BucketItem } & SelectionProps) {
  const category = getCategory(item.category);
  const meta = [
    KIND_META[item.kind].label,
    category.label,
    settingTag(item.setting),
    item.location,
  ]
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
        <View className="flex-row items-center gap-2">
          <Text
            weight="600"
            size={16}
            numberOfLines={1}
            className="flex-shrink"
          >
            {item.title}
          </Text>
          <GoalBadge item={item} />
        </View>
        <Text variant="muted" size={13} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      {/* 고르기 모드에서는 체크 동그라미가 그 자리에 나온다 */}
      {!selection.selecting ? (
        <View className="flex-row items-center gap-2">
          <CommentBadge count={item.commentCount} />
          <Icon as={ChevronRight} size={20} className="text-muted-foreground" />
        </View>
      ) : null}
    </Selectable>
  );
}

/** 간단히 보기: 이모지 + 제목 한 줄 (촘촘하게) */
export function BucketRowCompact({
  item,
  ...selection
}: { item: BucketItem } & SelectionProps) {
  const category = getCategory(item.category);
  return (
    <Selectable
      {...selection}
      onPress={() =>
        router.push({ pathname: '/item/[id]', params: { id: item.id } })
      }
      className="flex-row items-center gap-2.5 rounded-xl border px-3 py-2.5 bg-card border-border active:opacity-70"
    >
      <Text size={16}>{category.emoji}</Text>
      <Text weight="500" size={15} numberOfLines={1} className="flex-shrink">
        {item.title}
      </Text>
      <View className="flex-1 pr-6">
        <GoalBadge item={item} />
      </View>
      {!selection.selecting ? (
        <View className="flex-row items-center gap-2">
          <CommentBadge count={item.commentCount} />
          <Text size={11} className="text-muted-foreground">
            {settingTag(item.setting)}
          </Text>
        </View>
      ) : null}
    </Selectable>
  );
}

/** 목표 날짜가 있으면 제목 옆에 작은 D-day (지났으면 회색) */
function GoalBadge({ item }: { item: BucketItem }) {
  if (!item.goal || item.done) return null;
  const passed = goalPassed(item.goal.date);
  return (
    <View
      className={cn(
        'rounded-full px-2 py-0.5',
        passed ? 'bg-muted' : 'bg-accent'
      )}
    >
      <Text
        weight="700"
        size={11}
        className={passed ? 'text-muted-foreground' : 'text-primary'}
      >
        {goalDday(item.goal.date)}
      </Text>
    </View>
  );
}

/** 말풍선 안에 댓글 수 (10개부터는 9+). 댓글이 없으면 그리지 않는다 */
export function CommentBadge({ count }: { count?: number }) {
  if (!count) return null;
  const label = count > 9 ? '9+' : String(count);
  return (
    <View
      accessibilityLabel={`댓글 ${count}개`}
      className="items-center justify-center"
      style={{ width: 26, height: 26 }}
    >
      <Icon
        as={MessageCircle}
        size={26}
        strokeWidth={1.25}
        className="text-muted-foreground"
      />
      {/* 말풍선 꼬리만큼 살짝 위로 올려 가운데에 맞춘다 */}
      <View className="absolute inset-0 items-center justify-center pb-px">
        <Text
          weight="700"
          size={label.length > 1 ? 8 : 10}
          className="text-muted-foreground"
        >
          {label}
        </Text>
      </View>
    </View>
  );
}
