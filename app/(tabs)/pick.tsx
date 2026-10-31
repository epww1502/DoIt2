import dayjs from 'dayjs';
import { router } from 'expo-router';
import { SlidersHorizontal } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Icon, Text } from '@/components/atoms';
import { ItemIcon } from '@/components/bucket/ItemIcon';
import { PlateDiceIcon } from '@/components/bucket/PlateDiceIcon';
import { useSurface } from '@/hooks/useSurface';
import {
  ALL_FILTER,
  CategoryFilter,
  matchesFilter,
  type BucketFilter,
} from '@/components/bucket/CategoryFilter';
import { EmptyState } from '@/components/bucket/EmptyState';
import { useReviewCtx } from '@/hooks/useReviewCtx';
import { shownRating } from '@/lib/bucket/reviews';
import { SyncEmpty, useListSync } from '@/components/bucket/SyncNotice';
import { PickReel } from '@/components/bucket/PickReel';
import { ScreenHeader } from '@/components/bucket/ScreenHeader';
import {
  activePickFilterCount,
  pickFilterSummary,
  PickFilterSheet,
  type PickFilter,
} from '@/components/bucket/PickFilterSheet';
import { SpaceSwitcher } from '@/components/space/SpaceSwitcher';
import { WeatherBanner } from '@/components/bucket/WeatherBanner';
import { usePlacesWeather } from '@/hooks/usePlacesWeather';
import { useTodayWeather } from '@/hooks/useTodayWeather';
import { hapticSuccess } from '@/lib/haptics';
import {
  getCategory,
  KIND_META,
  settingTag,
  type BucketItem,
} from '@/lib/bucket/types';
import { cn } from '@/lib/utils';
import { weatherKey } from '@/lib/weather';
import { useBucketStore } from '@/store/useBucketStore';
import { usePrimaryColor, useSettingsStore } from '@/store/useSettingsStore';
import { useTabBarSpace } from '@/hooks/useTabBarSpace';

/** 애니메이션에서 뽑힌 카드 앞으로 지나가는 카드 수 */
const REEL_BEFORE = 18;
/** 뽑힌 카드 뒤에 더 붙이는 카드 수 (멈출 때 오른쪽이 비지 않게) */
const REEL_AFTER = 5;

type Reel = {
  cards: BucketItem[];
  /** cards 안에서 뽑힌 카드 위치 */
  pickedIndex: number;
};

function randomOf<T>(list: T[], except?: T): T {
  if (list.length <= 1) return list[0];
  let next = list[Math.floor(Math.random() * list.length)];
  while (next === except) {
    next = list[Math.floor(Math.random() * list.length)];
  }
  return next;
}

/**
 * 지나갈 카드들: 바로 옆 카드끼리는 겹치지 않게 섞고, 뽑힌 카드를 중간에 넣는다.
 * 뽑힌 카드 앞뒤도 같은 항목이 붙지 않게 한다.
 */
function buildReel(candidates: BucketItem[], picked: BucketItem): Reel {
  const cards: BucketItem[] = [];
  let prev: BucketItem | undefined;
  for (let i = 0; i < REEL_BEFORE; i++) {
    // 뽑힌 카드 바로 앞은 뽑힌 것과 다르게
    prev = randomOf(candidates, i === REEL_BEFORE - 1 ? picked : prev);
    cards.push(prev);
  }
  cards.push(picked);
  prev = picked;
  for (let i = 0; i < REEL_AFTER; i++) {
    prev = randomOf(candidates, prev);
    cards.push(prev);
  }
  return { cards, pickedIndex: REEL_BEFORE };
}

export default function PickScreen() {
  const items = useBucketStore((state) => state.items);
  const primary = usePrimaryColor();
  const tabBarSpace = useTabBarSpace();
  const surface = useSurface();
  const reviewCtx = useReviewCtx();
  // 공간 목록을 아직 못 받았으면 '없음' 대신 불러오는 중·다시 시도
  const sync = useListSync();
  const pickAnimation = useSettingsStore((s) => s.pickAnimation);
  const redoMinRating = useSettingsStore((s) => s.redoMinRating);
  const setRedoMinRating = useSettingsStore((s) => s.setRedoMinRating);
  const [filter, setFilter] = useState<BucketFilter>(ALL_FILTER);
  const [currentId, setCurrentId] = useState<string | null>(null);
  /** 촤르륵 지나가는 중인 카드들. null이면 멈춰 있음 */
  const [reel, setReel] = useState<Reel | null>(null);
  const isShuffling = reel !== null;
  const [includeOutdoor, setIncludeOutdoor] = useState(false);
  /** 이미 함께한 것도 다시 뽑을지 */
  const [includeDone, setIncludeDone] = useState(false);
  const { state: weatherState, reload: reloadWeather } = useTodayWeather();
  /** 실내만 / 실외만 뽑기 */
  const [settingFilter, setSettingFilter] =
    useState<PickFilter['setting']>('all');

  // 내 위치 날씨 (장소 좌표가 없는 항목은 이걸로 판단한다)
  const hereIsRainy =
    weatherState.status === 'ready' && weatherState.weather.isRainy;

  const filtered = useMemo(
    () =>
      items.filter(
        (it) =>
          // 해본 것은 '이미 해본 것도 포함'을 켜고, 설정한 별점 이상일 때만
          (!it.done ||
            (includeDone &&
              (redoMinRating <= 1 ||
                (shownRating(it, reviewCtx) ?? 0) >= redoMinRating))) &&
          (settingFilter === 'all' || it.setting === settingFilter) &&
          matchesFilter(it, filter)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      items,
      filter,
      includeDone,
      redoMinRating,
      settingFilter,
      reviewCtx.userId,
      reviewCtx.inSpace,
    ]
  );

  // 장소 좌표가 있는 실외 항목은 그 장소의 날씨를 따로 본다
  const outdoorPlaces = useMemo(
    () =>
      filtered
        .filter((it) => it.setting === 'outdoor' && it.place)
        .map((it) => it.place!),
    [filtered]
  );
  const placesWeather = usePlacesWeather(outdoorPlaces);

  /** 이 실외 항목을 할 곳에 오늘 비가 오는지 */
  const isRainyFor = useCallback(
    (it: BucketItem) => {
      const placeWeather = it.place
        ? placesWeather[weatherKey(it.place)]
        : undefined;
      // 장소 날씨를 아직 못 받았으면 내 위치 날씨로 대신
      return placeWeather ? placeWeather.isRainy : hereIsRainy;
    },
    [placesWeather, hereIsRainy]
  );

  // 비 오는 곳의 실외 항목은 뺀다 ('실외도 포함'을 켜면 같이 뽑는다)
  const rainyOutdoor = useMemo(
    () => filtered.filter((it) => it.setting === 'outdoor' && isRainyFor(it)),
    [filtered, isRainyFor]
  );
  const candidates = useMemo(() => {
    if (includeOutdoor) return filtered;
    const rainyIds = new Set(rainyOutdoor.map((it) => it.id));
    return filtered.filter((it) => !rainyIds.has(it.id));
  }, [filtered, rainyOutdoor, includeOutdoor]);
  const excludedCount = filtered.length - candidates.length;
  /** 비 때문에 뺄 게 있거나 내 위치에 비가 오면 '실외 포함' 스위치를 보여준다 */
  const rainMatters = hereIsRainy || rainyOutdoor.length > 0;
  // 뽑힌 게 지워지거나 해낸 것이 되면 자연스럽게 결과가 사라진다
  const current: BucketItem | null =
    candidates.find((it) => it.id === currentId) ?? null;

  /** 뽑는 범위가 바뀌면 지금 결과를 지운다 */
  const resetPick = () => {
    setReel(null);
    setCurrentId(null);
  };

  const changeFilter = (next: BucketFilter) => {
    resetPick();
    setFilter(next);
  };

  const [filterOpen, setFilterOpen] = useState(false);
  const pickFilter: PickFilter = {
    setting: settingFilter,
    includeDone,
    minRating: redoMinRating,
    includeOutdoor,
  };
  const filterCount = activePickFilterCount(pickFilter);
  const filterSummary = pickFilterSummary(pickFilter);

  const applyPickFilter = (next: PickFilter) => {
    resetPick();
    setSettingFilter(next.setting);
    setIncludeDone(next.includeDone);
    setRedoMinRating(next.minRating);
    setIncludeOutdoor(next.includeOutdoor);
  };

  const shuffle = () => {
    if (candidates.length === 0 || isShuffling) return;
    // 직전에 뽑힌 것은 되도록 피한다
    const picked = randomOf(candidates, current ?? undefined);
    if (!pickAnimation) {
      // 설정에서 애니메이션을 끄면 바로 결과
      setCurrentId(picked.id);
      return;
    }
    setCurrentId(null);
    setReel(buildReel(candidates, picked));
  };

  // 카드가 멈추면 마지막 카드가 결과
  const onReelEnd = useCallback(() => {
    hapticSuccess();
    if (reel) setCurrentId(reel.cards[reel.pickedIndex].id);
    setReel(null);
  }, [reel]);

  // 이미 해본 것만 남아서 뽑을 게 없을 때 안내하려고
  const doneInFilter = items.filter(
    (it) => it.done && matchesFilter(it, filter)
  ).length;
  /** 해본 건 있지만 별점이 낮아서 다 빠졌는지 */
  const lowRatedOnly = includeDone && redoMinRating > 1 && doneInFilter > 0;
  const category = current ? getCategory(current.category) : null;
  const decided = current && !isShuffling;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader
        right={<SpaceSwitcher />}
        title="오늘 뭐 하지?"
        subtitle="고민될 땐 버킷리스트에서 하나 뽑아봐요"
      />

      {items.length === 0 && sync.kind !== 'ok' ? (
        <SyncEmpty sync={sync} />
      ) : items.length === 0 ? (
        <EmptyState
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
            rainMatters={rainMatters}
            includeOutdoor={includeOutdoor}
            excludedCount={excludedCount}
          />
          {/* 뽑기 조건: 켜진 조건 요약 + 필터 버튼 (누르면 시트) */}
          <View className="mx-5 mb-3 flex-row items-center gap-2">
            <Text
              size={13}
              numberOfLines={1}
              className={cn(
                'flex-1',
                filterCount > 0 ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {filterCount > 0 ? filterSummary : '모든 버킷리스트에서 뽑아요'}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                filterCount > 0
                  ? `뽑기 조건 ${filterCount}개 적용 중`
                  : '뽑기 조건'
              }
              onPress={() => setFilterOpen(true)}
              className={cn(
                'h-9 flex-row items-center gap-1.5 rounded-lg px-3 active:opacity-70',
                filterCount > 0 ? 'bg-primary' : 'bg-accent'
              )}
            >
              <Icon
                as={SlidersHorizontal}
                size={15}
                className={
                  filterCount > 0
                    ? 'text-primary-foreground'
                    : 'text-muted-foreground'
                }
              />
              <Text
                size={13}
                weight="600"
                className={
                  filterCount > 0
                    ? 'text-primary-foreground'
                    : 'text-muted-foreground'
                }
              >
                {filterCount > 0 ? `조건 ${filterCount}` : '조건'}
              </Text>
            </Pressable>
          </View>
          <CategoryFilter value={filter} onChange={changeFilter} />

          {reel ? (
            <View className="flex-1 justify-center">
              <PickReel
                reel={reel.cards}
                pickedIndex={reel.pickedIndex}
                onEnd={onReelEnd}
              />
            </View>
          ) : (
            // 위 옵션이 늘어 공간이 좁아도 카드가 아래 버튼과 겹치지 않게 스크롤 안에 둔다
            <ScrollView
              className="flex-1"
              contentContainerClassName="grow justify-center px-5 py-3"
            >
              <View
                className={cn(
                  'min-h-[200px] items-center justify-center gap-2 rounded-3xl border-2 p-5',
                  decided
                    ? 'border-primary bg-card'
                    : 'border-dashed border-border bg-card'
                )}
              >
                {current && category ? (
                  <>
                    <ItemIcon item={current} size={88} emojiSize={44} bare />
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
                        settingTag(current.setting),
                        current.location,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                    {current.done ? (
                      <Text size={12} className="text-muted-foreground">
                        {dayjs(current.done.date).format('YYYY년 M월 D일')}에
                        해봤어요
                      </Text>
                    ) : null}
                    {decided ? (
                      <Text weight="600" className="mt-2 text-primary">
                        {current.done
                          ? '한 번 더 어때요?'
                          : current.kind === 'place'
                            ? '오늘은 여기 어때요?'
                            : '오늘은 이거 어때요?'}
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <>
                    {/* 뽑을 게 없을 땐 아이콘 없이 안내 글만 */}
                    {candidates.length > 0 ? (
                      <PlateDiceIcon
                        size={52}
                        color={primary}
                        cutout={surface.card}
                        strokeWidth={1.6}
                      />
                    ) : null}
                    <Text variant="muted" className="text-center">
                      {candidates.length > 0
                        ? `${candidates.length}개 중에서 하나를 골라드릴게요`
                        : excludedCount > 0
                          ? "비 때문에 실외를 빼니 뽑을 게 없어요.\n조건에서 '비 와도 실외 포함'을 켜보세요"
                          : !includeDone && doneInFilter > 0
                            ? "여기 있는 건 다 해봤어요!\n조건에서 '이미 해본 것도 포함'을 켜보세요"
                            : lowRatedOnly
                              ? `${redoMinRating}점 이상인 게 없어요.\n조건에서 최소 별점을 낮춰보세요`
                              : '여기엔 아직 담긴 게 없어요'}
                    </Text>
                  </>
                )}
              </View>
            </ScrollView>
          )}

          <View
            className="gap-2 px-5 pt-2"
            style={{ paddingBottom: tabBarSpace + 12 }}
          >
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
      <PickFilterSheet
        visible={filterOpen}
        value={pickFilter}
        rainMatters={rainMatters}
        onApply={applyPickFilter}
        onClose={() => setFilterOpen(false)}
      />
    </SafeAreaView>
  );
}
