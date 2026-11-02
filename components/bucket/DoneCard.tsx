import { doneDateLabel } from '@/lib/bucket/doneDate';
import { router } from 'expo-router';
import { View } from 'react-native';

import { Text } from '@/components/atoms';
import { TodoPills } from '@/components/bucket/TodoPills';
import {
  itemTodos,
  recordPhotos,
  settingTag,
  type BucketItem,
} from '@/lib/bucket/types';
import { cn } from '@/lib/utils';

import type { SelectionProps } from './BucketRow';
import { DonePhoto, PhotoImage } from './DonePhoto';
import { Selectable } from './Selectable';
import { StarRating } from './StarRating';
import { CategoryIcon } from '@/components/bucket/CategoryIcon';

/** 날짜·실내 옆에 붙는 ' · 댓글 3개' (없으면 빈칸) */
function commentText(count?: number) {
  return count ? ` · 댓글 ${count}개` : '';
}

/** '함께한 것' 목록의 카드. done이 있는 항목만 넘긴다. 길게 누르면 여러 개 고르기 */
export function DoneCard({
  item,
  ...selection
}: { item: BucketItem } & SelectionProps) {
  const done = item.done;
  if (!done) return null;

  return (
    <Selectable
      {...selection}
      onPress={() =>
        router.push({ pathname: '/item/[id]', params: { id: item.id } })
      }
      className="overflow-hidden rounded-2xl border border-border bg-card active:opacity-80"
    >
      {recordPhotos(done).length > 0 ? (
        <DonePhoto done={done} />
      ) : (
        <View className="h-24 items-center justify-center bg-accent">
          <CategoryIcon category={item.category} size={36} />
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
          {doneDateLabel(done, 'long')}
          {` · ${settingTag(item.setting)}`}
          {commentText(item.commentCount)}
          {item.location ? ` · ${item.location}` : ''}
        </Text>
        {done.review ? (
          <Text variant="body" className="mt-1">
            “{done.review}”
          </Text>
        ) : null}
        {/* 그날 체크한 할 것 */}
        <TodoPills
          todos={itemTodos(item).filter((t) => t.done)}
          className="mt-1"
        />
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
  const photo = recordPhotos(done)[0];

  return (
    <Selectable
      {...selection}
      onPress={() =>
        router.push({ pathname: '/item/[id]', params: { id: item.id } })
      }
      // 고르기 모드에선 오른쪽 위 체크 동그라미 자리를 비운다
      className={cn(
        'flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3 active:opacity-80',
        selection.selecting && 'pr-12'
      )}
    >
      <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-accent">
        {photo ? (
          <PhotoImage photo={photo} style={{ width: 56, height: 56 }} />
        ) : (
          <CategoryIcon category={item.category} size={24} />
        )}
      </View>
      <View className="flex-1 gap-1">
        <Text weight="600" size={15} numberOfLines={1}>
          {item.title}
        </Text>
        <Text variant="muted" size={12} numberOfLines={1}>
          {doneDateLabel(done, 'short')}
          {` · ${settingTag(item.setting)}`}
          {commentText(item.commentCount)}
          {item.location ? ` · ${item.location}` : ''}
        </Text>
      </View>
      {/* 평가를 건너뛰었으면 별을 빼고 보여준다 */}
      {done.rating > 0 ? <StarRating value={done.rating} size={12} /> : null}
    </Selectable>
  );
}
