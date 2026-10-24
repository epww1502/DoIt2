import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fab } from '@/components/atoms';
import { CategoryFilter } from '@/components/place/CategoryFilter';
import { EmptyState } from '@/components/place/EmptyState';
import { PlaceRow } from '@/components/place/PlaceRow';
import { ScreenHeader } from '@/components/place/ScreenHeader';
import type { CategoryKey } from '@/lib/place/types';
import { usePlaceStore } from '@/store/usePlaceStore';

export default function BucketListScreen() {
  const places = usePlaceStore((state) => state.places);
  const [category, setCategory] = useState<CategoryKey | null>(null);

  const wishes = useMemo(() => places.filter((p) => !p.visit), [places]);
  const filtered = useMemo(
    () => (category ? wishes.filter((p) => p.category === category) : wishes),
    [wishes, category]
  );

  const goNew = () => router.push('/place/new');

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader
        title="우리 갈 곳"
        subtitle={
          wishes.length > 0
            ? `같이 가고 싶은 곳이 ${wishes.length}곳 있어요`
            : '같이 가고 싶은 곳을 모아봐요'
        }
      />

      {wishes.length === 0 ? (
        <EmptyState
          emoji="💌"
          title="아직 담은 곳이 없어요"
          description={
            '맛집, 카페, 여행지 뭐든 좋아요.\n둘이 가고 싶은 곳을 하나씩 담아봐요.'
          }
          actionLabel="첫 장소 담기"
          onAction={goNew}
        />
      ) : (
        <>
          <CategoryFilter value={category} onChange={setCategory} />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <PlaceRow place={item} />}
            contentContainerClassName="gap-3 px-5 pb-28 pt-4"
            ListEmptyComponent={
              <EmptyState
                emoji="🔍"
                title="이 카테고리엔 아직 없어요"
                description="다른 카테고리를 골라보거나 새로 담아봐요."
              />
            }
          />
          <View className="absolute bottom-6 right-5">
            <Fab accessibilityLabel="갈 곳 담기" onPress={goNew} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
