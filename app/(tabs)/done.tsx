import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Segmented } from '@/components/atoms';
import { DoneCard } from '@/components/bucket/DoneCard';
import { EmptyState } from '@/components/bucket/EmptyState';
import { ScreenHeader } from '@/components/bucket/ScreenHeader';
import { KIND_META, type BucketKind } from '@/lib/bucket/types';
import { useBucketStore } from '@/store/useBucketStore';

type KindOption = 'all' | BucketKind;

const KIND_OPTIONS: { value: KindOption; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'place', label: `${KIND_META.place.emoji} 다녀온 곳` },
  { value: 'activity', label: `${KIND_META.activity.emoji} 해본 것` },
];

export default function DoneScreen() {
  const items = useBucketStore((state) => state.items);
  const [kind, setKind] = useState<KindOption>('all');

  // 최근에 한 순
  const done = useMemo(
    () =>
      items
        .filter((it) => it.done)
        .sort((a, b) => (b.done!.date > a.done!.date ? 1 : -1)),
    [items]
  );
  const shown = useMemo(
    () => (kind === 'all' ? done : done.filter((it) => it.kind === kind)),
    [done, kind]
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader
        title="함께한 것"
        subtitle={
          done.length > 0
            ? `벌써 ${done.length}개나 같이 해냈어요 💕`
            : undefined
        }
      />
      {done.length > 0 ? (
        <View className="px-5 pb-4">
          <Segmented options={KIND_OPTIONS} value={kind} onChange={setKind} />
        </View>
      ) : null}
      <FlatList
        data={shown}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <DoneCard item={item} />}
        contentContainerClassName="grow gap-4 px-5 pb-10"
        ListEmptyComponent={
          done.length === 0 ? (
            <EmptyState
              emoji="👣"
              title="아직 함께한 게 없어요"
              description={
                "버킷리스트에서 하나를 고르고\n'다녀왔어요', '해냈어요'를 누르면 여기에 쌓여요."
              }
              actionLabel="버킷리스트 보러 가기"
              onAction={() => router.navigate('/')}
            />
          ) : (
            <EmptyState
              emoji="🔍"
              title="여기엔 아직 없어요"
              description="다른 종류를 골라봐요."
            />
          )
        }
      />
    </SafeAreaView>
  );
}
