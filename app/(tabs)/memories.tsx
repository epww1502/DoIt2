import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/place/EmptyState';
import { MemoryCard } from '@/components/place/MemoryCard';
import { ScreenHeader } from '@/components/place/ScreenHeader';
import { usePlaceStore } from '@/store/usePlaceStore';

export default function MemoriesScreen() {
  const places = usePlaceStore((state) => state.places);

  // 최근에 다녀온 순
  const visited = useMemo(
    () =>
      places
        .filter((p) => p.visit)
        .sort((a, b) => (b.visit!.date > a.visit!.date ? 1 : -1)),
    [places]
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader
        title="함께 다녀온 곳"
        subtitle={
          visited.length > 0
            ? `벌써 ${visited.length}곳이나 같이 다녀왔어요 💕`
            : undefined
        }
      />
      <FlatList
        data={visited}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MemoryCard place={item} />}
        contentContainerClassName="grow gap-4 px-5 pb-10"
        ListEmptyComponent={
          <EmptyState
            emoji="👣"
            title="아직 다녀온 곳이 없어요"
            description={
              "'갈 곳'에서 장소를 고르고\n'다녀왔어요'를 누르면 여기에 쌓여요."
            }
            actionLabel="갈 곳 보러 가기"
            onAction={() => router.navigate('/')}
          />
        }
      />
    </SafeAreaView>
  );
}
