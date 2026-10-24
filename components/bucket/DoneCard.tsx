import dayjs from 'dayjs';
import { router } from 'expo-router';
import { View } from 'react-native';

import { Text } from '@/components/atoms';
import { getCategory, settingTag, type BucketItem } from '@/lib/bucket/types';

import type { SelectionProps } from './BucketRow';
import { DonePhoto } from './DonePhoto';
import { Selectable } from './Selectable';
import { StarRating } from './StarRating';

/** '함께한 것' 목록의 카드. done이 있는 항목만 넘긴다. 길게 누르면 여러 개 고르기 */
export function DoneCard({
  item,
  ...selection
}: { item: BucketItem } & SelectionProps) {
  const done = item.done;
  if (!done) return null;
  const category = getCategory(item.category);

  return (
    <Selectable
      {...selection}
      onPress={() =>
        router.push({ pathname: '/item/[id]', params: { id: item.id } })
      }
      className="overflow-hidden rounded-2xl border bg-card border-border active:opacity-80"
    >
      {done.photoUri || done.photoPath ? (
        <DonePhoto done={done} />
      ) : (
        <View className="h-24 items-center justify-center bg-accent">
          <Text size={36}>{category.emoji}</Text>
        </View>
      )}
      <View className="gap-1.5 p-4">
        <View className="flex-row items-center justify-between gap-2">
          <Text weight="700" size={17} numberOfLines={1} className="flex-1">
            {item.title}
          </Text>
          <StarRating value={done.rating} size={14} />
        </View>
        <Text variant="muted" size={13}>
          {dayjs(done.date).format('YYYY년 M월 D일 (dd)')}
          {` · ${settingTag(item.setting)}`}
          {item.location ? ` · ${item.location}` : ''}
        </Text>
        {done.review ? (
          <Text variant="body" className="mt-1">
            “{done.review}”
          </Text>
        ) : null}
      </View>
    </Selectable>
  );
}
