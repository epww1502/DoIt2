import dayjs from 'dayjs';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Text } from '@/components/atoms';
import {
  ALL_FILTER,
  CategoryFilter,
  matchesFilter,
  type BucketFilter,
} from '@/components/bucket/CategoryFilter';
import { EmptyState } from '@/components/bucket/EmptyState';
import { ScreenHeader } from '@/components/bucket/ScreenHeader';
import { SpaceSwitcher } from '@/components/space/SpaceSwitcher';
import { WeatherBanner } from '@/components/bucket/WeatherBanner';
import { useTodayWeather } from '@/hooks/useTodayWeather';
import { getCategory, KIND_META, type BucketItem } from '@/lib/bucket/types';
import { colors, themeColors } from '@/constants/colors';
import { useThemeMode } from '@/contexts/ThemeModeContext';
import { cn } from '@/lib/utils';
import { useBucketStore } from '@/store/useBucketStore';

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
  const items = useBucketStore((state) => state.items);
  const [filter, setFilter] = useState<BucketFilter>(ALL_FILTER);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [includeOutdoor, setIncludeOutdoor] = useState(false);
  /** 이미 함께한 것도 다시 뽑을지 */
  const [includeDone, setIncludeDone] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const { state: weatherState, reload: reloadWeather } = useTodayWeather();

  // 비 오는 날에는 실외 항목을 뺀다 ('실외도 포함'을 켜면 같이 뽑는다)
  const isRainy =
    weatherState.status === 'ready' && weatherState.weather.isRainy;
  const skipOutdoor = isRainy && !includeOutdoor;

  const filtered = useMemo(
    () =>
      items.filter(
        (it) => (includeDone || !it.done) && matchesFilter(it, filter)
      ),
    [items, filter, includeDone]
  );
  const candidates = useMemo(
    () =>
      skipOutdoor
        ? filtered.filter((it) => it.setting !== 'outdoor')
        : filtered,
    [filtered, skipOutdoor]
  );
  const excludedCount = filtered.length - candidates.length;
  // 뽑힌 게 지워지거나 해낸 것이 되면 자연스럽게 결과가 사라진다
  const current: BucketItem | null =
    candidates.find((it) => it.id === currentId) ?? null;

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);

  /** 뽑는 범위가 바뀌면 지금 결과를 지운다 */
  const resetPick = () => {
    stop();
    setIsShuffling(false);
    setCurrentId(null);
  };

  const changeFilter = (next: BucketFilter) => {
    resetPick();
    setFilter(next);
  };

  const changeIncludeOutdoor = (next: boolean) => {
    resetPick();
    setIncludeOutdoor(next);
  };

  const changeIncludeDone = (next: boolean) => {
    resetPick();
    setIncludeDone(next);
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

  // 이미 해본 것만 남아서 뽑을 게 없을 때 안내하려고
  const doneInFilter = items.filter(
    (it) => it.done && matchesFilter(it, filter)
  ).length;
  const category = current ? getCategory(current.category) : null;
  const decided = current && !isShuffling;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader
        right={<SpaceSwitcher />}
        title="오늘 뭐 하지?"
        subtitle="고민될 땐 버킷리스트에서 하나 뽑아봐요"
      />

      {items.length === 0 ? (
        <EmptyState
          emoji="🎲"
          title="뽑을 게 없어요"
          description="버킷리스트를 먼저 담아주세요."
          actionLabel="버킷리스트 담으러 가기"
          onAction={() => router.push('/item/new')}
        />
      ) : (
        <View className="flex-1">
          <WeatherBanner
            state={weatherState}
            onReload={reloadWeather}
            includeOutdoor={includeOutdoor}
            onChangeIncludeOutdoor={changeIncludeOutdoor}
            excludedCount={excludedCount}
          />
          <IncludeDoneRow value={includeDone} onChange={changeIncludeDone} />
          <CategoryFilter value={filter} onChange={changeFilter} />

          <View className="flex-1 justify-center px-5">
            <View
              className={cn(
                'min-h-[260px] items-center justify-center gap-3 rounded-3xl border-2 p-6',
                decided
                  ? 'bg-card border-primary'
                  : 'border-dashed bg-card border-border'
              )}
            >
              {current && category ? (
                <>
                  <Text size={56}>{category.emoji}</Text>
                  <Text
                    weight="700"
                    size={24}
                    numberOfLines={2}
                    className="text-center"
                  >
                    {current.title}
                  </Text>
                  <Text variant="muted" className="text-center">
                    {[
                      KIND_META[current.kind].label,
                      category.label,
                      current.location,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                  {current.done ? (
                    <Text size={12} className="text-muted-foreground">
                      🔁 {dayjs(current.done.date).format('YYYY년 M월 D일')}에
                      해봤어요
                    </Text>
                  ) : null}
                  {decided ? (
                    <Text weight="600" className="mt-2 text-primary">
                      {current.done
                        ? '한 번 더 어때요? 🔁'
                        : current.kind === 'place'
                          ? '오늘은 여기 어때요? ✨'
                          : '오늘은 이거 어때요? ✨'}
                    </Text>
                  ) : null}
                </>
              ) : (
                <>
                  <Text size={56}>🎲</Text>
                  <Text variant="muted" className="text-center">
                    {candidates.length > 0
                      ? `${candidates.length}개 중에서 하나를 골라드릴게요`
                      : excludedCount > 0
                        ? "비 때문에 실외를 빼니 뽑을 게 없어요.\n'실외도 포함'을 켜보세요"
                        : !includeDone && doneInFilter > 0
                          ? "여기 있는 건 다 해봤어요! 🎉\n'이미 해본 것도 포함'을 켜보세요"
                          : '여기엔 아직 담긴 게 없어요'}
                  </Text>
                </>
              )}
            </View>
          </View>

          <View className="gap-2 px-5 pb-6">
            {decided ? (
              <Button
                label={current.kind === 'place' ? '여기 가자!' : '이거 하자!'}
                onPress={() =>
                  router.push({
                    pathname: '/item/[id]',
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

/** '이미 해본 것도 포함' 스위치 줄 */
function IncludeDoneRow({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const { colorScheme } = useThemeMode();
  return (
    <View className="mx-5 mb-3 flex-row items-center justify-between">
      <Text size={13} className="text-muted-foreground">
        🔁 이미 해본 것도 포함
      </Text>
      <Switch
        accessibilityLabel="이미 해본 것도 포함해서 뽑기"
        value={value}
        onValueChange={onChange}
        trackColor={{
          false: themeColors[colorScheme].input,
          true: colors.primary,
        }}
        thumbColor={colors.white}
      />
    </View>
  );
}
