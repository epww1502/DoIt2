import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Text } from '@/components/atoms';
import { CategoryFilter } from '@/components/place/CategoryFilter';
import { EmptyState } from '@/components/place/EmptyState';
import { ScreenHeader } from '@/components/place/ScreenHeader';
import { getCategory, type CategoryKey, type Place } from '@/lib/place/types';
import { cn } from '@/lib/utils';
import { usePlaceStore } from '@/store/usePlaceStore';

/** 섞는 동안 이름이 바뀌는 간격과 횟수 */
const SHUFFLE_INTERVAL_MS = 80;
const SHUFFLE_STEPS = 16;

function randomOf<T>(list: T[], except?: T): T {
  if (list.length <= 1) return list[0];
  let next = list[Math.floor(Math.random() * list.length)];
  while (next === except) {
    next = list[Math.floor(Math.random() * list.length)];
  }
  return next;
}

export default function PickScreen() {
  const places = usePlaceStore((state) => state.places);
  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const candidates = useMemo(
    () =>
      places.filter(
        (p) => !p.visit && (category === null || p.category === category)
      ),
    [places, category]
  );
  // 뽑힌 곳이 지워지거나 다녀온 곳이 되면 자연스럽게 결과가 사라진다
  const current: Place | null =
    candidates.find((p) => p.id === currentId) ?? null;

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);

  const changeCategory = (next: CategoryKey | null) => {
    stop();
    setIsShuffling(false);
    setCurrentId(null);
    setCategory(next);
  };

  const shuffle = () => {
    if (candidates.length === 0 || isShuffling) return;
    setIsShuffling(true);
    let step = 0;
    let last = current ?? undefined;
    timer.current = setInterval(() => {
      step += 1;
      last = randomOf(candidates, last);
      setCurrentId(last.id);
      if (step >= SHUFFLE_STEPS) {
        stop();
        setIsShuffling(false);
      }
    }, SHUFFLE_INTERVAL_MS);
  };

  const wishCount = places.filter((p) => !p.visit).length;
  const category_ = current ? getCategory(current.category) : null;
  const decided = current && !isShuffling;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader
        title="오늘 뭐 하지?"
        subtitle="고민될 땐 버킷리스트에서 하나 뽑아봐요"
      />

      {wishCount === 0 ? (
        <EmptyState
          emoji="🎲"
          title="뽑을 곳이 없어요"
          description="'갈 곳'에 장소를 먼저 담아주세요."
          actionLabel="장소 담으러 가기"
          onAction={() => router.push('/place/new')}
        />
      ) : (
        <View className="flex-1">
          <CategoryFilter value={category} onChange={changeCategory} />

          <View className="flex-1 justify-center px-5">
            <View
              className={cn(
                'min-h-[260px] items-center justify-center gap-3 rounded-3xl border-2 p-6',
                decided
                  ? 'bg-card border-primary'
                  : 'border-dashed bg-card border-border'
              )}
            >
              {current && category_ ? (
                <>
                  <Text size={56}>{category_.emoji}</Text>
                  <Text
                    weight="700"
                    size={24}
                    numberOfLines={2}
                    className="text-center"
                  >
                    {current.title}
                  </Text>
                  <Text variant="muted" className="text-center">
                    {[category_.label, current.location]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                  {decided ? (
                    <Text weight="600" className="mt-2 text-primary">
                      오늘은 여기 어때요? 💘
                    </Text>
                  ) : null}
                </>
              ) : (
                <>
                  <Text size={56}>🎲</Text>
                  <Text variant="muted" className="text-center">
                    {candidates.length > 0
                      ? `${candidates.length}곳 중에서 하나를 골라드릴게요`
                      : '이 카테고리엔 갈 곳이 없어요'}
                  </Text>
                </>
              )}
            </View>
          </View>

          <View className="gap-2 px-5 pb-6">
            {decided ? (
              <Button
                label="여기 가자!"
                onPress={() =>
                  router.push({
                    pathname: '/place/[id]',
                    params: { id: current.id },
                  })
                }
              />
            ) : null}
            <Button
              label={current ? '다시 뽑기' : '뽑기'}
              variant={decided ? 'outline' : 'primary'}
              disabled={candidates.length === 0 || isShuffling}
              onPress={shuffle}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
