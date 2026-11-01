import dayjs from 'dayjs';
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { useTogether } from '@/hooks/useTogether';
import { Icon, NavBar, Text } from '@/components/atoms';
import { PhotoImage } from '@/components/bucket/DonePhoto';
import { EmptyState } from '@/components/bucket/EmptyState';
import { useReviewCtx } from '@/hooks/useReviewCtx';
import { viewForMe } from '@/lib/bucket/reviews';
import { SyncEmpty, useListSync } from '@/components/bucket/SyncNotice';
import { countSpots, ItemsMap } from '@/components/bucket/ItemsMap';
import { StarRating } from '@/components/bucket/StarRating';
import { itemTodos, recordPhotos, type BucketItem } from '@/lib/bucket/types';
import { useBucketStore } from '@/store/useBucketStore';

/** 함께한 곳 지도: 장소를 골라둔 기록들을 핀으로. 핀을 누르면 아래에 그 기록 */
export default function DoneMapScreen() {
  const together = useTogether();
  const placesLabel = together ? '함께한 곳' : '다녀온 곳';
  const items = useBucketStore((s) => s.items);
  const reviewCtx = useReviewCtx();
  // 공간 목록을 아직 못 받았으면 '없음' 대신 불러오는 중·다시 시도
  const sync = useListSync();
  const insets = useSafeAreaInsets();

  // 다녀온 곳: 기록을 남긴 항목의 장소 + 체크한 할 것의 위치
  // (아직 목록에 있는 항목이라도 체크한 할 것은 다녀온 곳이다). 최근 순
  const visited = useMemo(
    () =>
      items
        .filter(
          (it) =>
            (it.done && it.place) ||
            itemTodos(it).some((t) => t.done && t.place)
        )
        .map((it) => viewForMe(it, reviewCtx))
        .sort((a, b) =>
          (b.done?.date ?? b.createdAt) > (a.done?.date ?? a.createdAt) ? 1 : -1
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, reviewCtx.userId, reviewCtx.inSpace]
  );
  const spotCount = useMemo(() => countSpots(visited, 'done'), [visited]);

  if (visited.length === 0) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <NavBar title={`${placesLabel} 지도`} />
        {sync.kind !== 'ok' ? (
          <SyncEmpty sync={sync} />
        ) : (
          <EmptyState
            title="지도에 찍을 곳이 아직 없어요"
            description={
              '장소를 골라둔 항목에 기록을 남기면\n여기에 핀으로 모여요.'
            }
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar title={`${placesLabel} ${spotCount}곳`} />
      <ItemsMap
        items={visited}
        withTodos="done"
        renderItem={(item) => <VisitedCard item={item} />}
        groupTitle={(group, placeName) =>
          `${placeName || '이곳'}에서 ${group.length}번 ${together ? '함께했어요' : '다녀왔어요'}`
        }
        hint="핀을 누르면 그날의 기록을 볼 수 있어요"
        bottomInset={insets.bottom}
      />
    </SafeAreaView>
  );
}

/** 고른 핀의 기록 요약. 누르면 항목 화면으로 */
function VisitedCard({ item }: { item: BucketItem }) {
  const done = item.done;
  const photo = recordPhotos(done)[0];
  const todos = itemTodos(item);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        router.push({ pathname: '/item/[id]', params: { id: item.id } })
      }
      className="flex-row items-center gap-3 active:opacity-70"
    >
      {photo ? (
        <View className="h-16 w-16 overflow-hidden rounded-xl bg-accent">
          <PhotoImage photo={photo} style={{ width: 64, height: 64 }} />
        </View>
      ) : null}
      <View className="flex-1 gap-1">
        <Text weight="700" size={16} numberOfLines={1}>
          {item.title}
        </Text>
        <Text variant="muted" size={12} numberOfLines={1}>
          {done
            ? [dayjs(done.date).format('YYYY년 M월 D일'), item.place?.name]
                .filter(Boolean)
                .join(' · ')
            : `아직 목록에 있어요 · 할 것 ${todos.filter((t) => t.done).length}/${todos.length}`}
        </Text>
        {done && done.rating > 0 ? (
          <StarRating value={done.rating} size={13} />
        ) : null}
      </View>
      <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
    </Pressable>
  );
}
