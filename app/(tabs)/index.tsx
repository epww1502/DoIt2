import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fab, ProgressBar, Text } from '@/components/atoms';
import { BucketRow } from '@/components/bucket/BucketRow';
import {
  ALL_FILTER,
  CategoryFilter,
  matchesFilter,
  type BucketFilter,
} from '@/components/bucket/CategoryFilter';
import { EmptyState } from '@/components/bucket/EmptyState';
import { ScreenHeader } from '@/components/bucket/ScreenHeader';
import { useBucketStore } from '@/store/useBucketStore';

export default function BucketListScreen() {
  const items = useBucketStore((state) => state.items);
  const [filter, setFilter] = useState<BucketFilter>(ALL_FILTER);

  const todo = useMemo(() => items.filter((it) => !it.done), [items]);
  const filtered = useMemo(
    () => todo.filter((it) => matchesFilter(it, filter)),
    [todo, filter]
  );
  const doneCount = items.length - todo.length;

  const goNew = () => router.push('/item/new');

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader
        title="우리 버킷리스트"
        subtitle={
          items.length === 0
            ? '같이 가고 싶은 곳, 해보고 싶은 것을 모아봐요'
            : undefined
        }
      />

      {items.length > 0 ? (
        <View className="mx-5 mb-4 gap-2 rounded-2xl p-4 bg-accent">
          <Text weight="600" size={15}>
            {items.length}개 중 {doneCount}개 해냈어요 💕
          </Text>
          <ProgressBar value={(doneCount / items.length) * 100} />
        </View>
      ) : null}

      {todo.length === 0 ? (
        <EmptyState
          emoji={items.length === 0 ? '💌' : '🎉'}
          title={
            items.length === 0
              ? '아직 담은 게 없어요'
              : '버킷리스트를 다 해냈어요!'
          }
          description={
            items.length === 0
              ? '맛집, 여행지도 좋고\n같이 요리하기, 사진 찍기도 좋아요.'
              : '다음에 같이 할 걸 또 담아봐요.'
          }
          actionLabel={items.length === 0 ? '첫 버킷리스트 담기' : '새로 담기'}
          onAction={goNew}
        />
      ) : (
        <>
          <CategoryFilter value={filter} onChange={setFilter} />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <BucketRow item={item} />}
            contentContainerClassName="gap-3 px-5 pb-28 pt-4"
            ListEmptyComponent={
              <EmptyState
                emoji="🔍"
                title="여기엔 아직 없어요"
                description="다른 걸 골라보거나 새로 담아봐요."
              />
            }
          />
          <View className="absolute bottom-6 right-5">
            <Fab accessibilityLabel="버킷리스트 담기" onPress={goNew} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
