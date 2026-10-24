import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, View } from 'react-native';
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
import {
  SelectionDeleteBar,
  SelectionHeader,
} from '@/components/bucket/SelectionBar';
import { SpaceSwitcher } from '@/components/space/SpaceSwitcher';
import { useSelection } from '@/hooks/useSelection';
import { useBucketStore } from '@/store/useBucketStore';

export default function BucketListScreen() {
  const items = useBucketStore((state) => state.items);
  const removeItems = useBucketStore((state) => state.removeItems);
  const [filter, setFilter] = useState<BucketFilter>(ALL_FILTER);

  const todo = useMemo(() => items.filter((it) => !it.done), [items]);
  const filtered = useMemo(
    () => todo.filter((it) => matchesFilter(it, filter)),
    [todo, filter]
  );
  const doneCount = items.length - todo.length;

  const goNew = () => router.push('/item/new');

  // 길게 눌러 여러 개 고르기 (보이는 항목 중에서만 센다)
  const selection = useSelection();
  const selectedIds = filtered
    .filter((it) => selection.selected.has(it.id))
    .map((it) => it.id);
  const allSelected =
    filtered.length > 0 && selectedIds.length === filtered.length;

  const confirmDelete = () =>
    Alert.alert(
      `${selectedIds.length}개를 지울까요?`,
      '지운 항목은 되돌릴 수 없어요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '지우기',
          style: 'destructive',
          onPress: () => {
            removeItems(selectedIds);
            selection.clear();
          },
        },
      ]
    );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      {selection.selecting ? (
        <SelectionHeader
          count={selectedIds.length}
          allSelected={allSelected}
          onCancel={selection.clear}
          onToggleAll={() =>
            allSelected
              ? selection.clear()
              : selection.selectAll(filtered.map((it) => it.id))
          }
        />
      ) : (
        <ScreenHeader
          right={<SpaceSwitcher />}
          title="버킷리스트"
          subtitle={
            items.length === 0
              ? '같이 가고 싶은 곳, 해보고 싶은 것을 모아봐요'
              : `아직 ${todo.length}개가 기다리고 있어요`
          }
        />
      )}

      {items.length > 0 ? (
        <View className="mx-5 mb-4 gap-2 rounded-2xl p-4 bg-accent">
          <Text weight="600" size={15}>
            {items.length}개 중 {doneCount}개 해냈어요 ✨
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
            extraData={selection.selected}
            renderItem={({ item, index }) => (
              <BucketRow
                item={item}
                index={index}
                selecting={selection.selecting}
                selected={selection.selected.has(item.id)}
                onLongPress={() => selection.start(item.id)}
                onToggle={() => selection.toggle(item.id)}
              />
            )}
            contentContainerClassName="gap-3 px-5 pb-28 pt-4"
            ListEmptyComponent={
              <EmptyState
                emoji="🔍"
                title="여기엔 아직 없어요"
                description="다른 걸 골라보거나 새로 담아봐요."
              />
            }
          />
          {selection.selecting ? (
            <SelectionDeleteBar
              count={selectedIds.length}
              onDelete={confirmDelete}
            />
          ) : (
            <View className="absolute bottom-6 right-5">
              <Fab accessibilityLabel="버킷리스트 담기" onPress={goNew} />
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
}
