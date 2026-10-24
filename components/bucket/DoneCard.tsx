import dayjs from 'dayjs';
import { router } from 'expo-router';
import { View } from 'react-native';

import { Text } from '@/components/atoms';
import {
  getCategory,
  recordPhotos,
  settingTag,
  type BucketItem,
} from '@/lib/bucket/types';
import { cn } from '@/lib/utils';

import type { SelectionProps } from './BucketRow';
import { DonePhoto, PhotoImage } from './DonePhoto';
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
      {recordPhotos(done).length > 0 ? (
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
          {/* 평가를 건너뛰었으면 별을 빼고 보여준다 */}
          {done.rating > 0 ? (
            <StarRating value={done.rating} size={14} />
          ) : null}
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

/** 간단히 보기: 작은 사진(없으면 카테고리 이모지) + 제목·날짜 한 줄 + 별점 */
export function DoneRow({
  item,
  ...selection
}: { item: BucketItem } & SelectionProps) {
  const done = item.done;
  if (!done) return null;
  const category = getCategory(item.category);
  const photo = recordPhotos(done)[0];

  return (
    <Selectable
      {...selection}
      onPress={() =>
        router.push({ pathname: '/item/[id]', params: { id: item.id } })
      }
      // 고르기 모드에선 오른쪽 위 체크 동그라미 자리를 비운다
      className={cn(
        'flex-row items-center gap-3 rounded-2xl border p-3 bg-card border-border active:opacity-80',
        selection.selecting && 'pr-12'
      )}
    >
      <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-accent">
        {photo ? (
          <PhotoImage photo={photo} style={{ width: 56, height: 56 }} />
        ) : (
          <Text size={24}>{category.emoji}</Text>
        )}
      </View>
      <View className="flex-1 gap-1">
        <Text weight="600" size={15} numberOfLines={1}>
          {item.title}
        </Text>
        <Text variant="muted" size={12} numberOfLines={1}>
          {dayjs(done.date).format('YYYY.M.D')}
          {` · ${settingTag(item.setting)}`}
          {item.location ? ` · ${item.location}` : ''}
        </Text>
      </View>
      {/* 평가를 건너뛰었으면 별을 빼고 보여준다 */}
      {done.rating > 0 ? <StarRating value={done.rating} size={12} /> : null}
    </Selectable>
  );
}
