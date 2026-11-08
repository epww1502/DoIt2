import {
  CalendarDays,
  ChartColumn,
  ChevronRight,
  CircleCheck,
  GalleryVertical,
  Images,
  List,
  Map as MapIcon,
  SlidersHorizontal,
  Sparkles,
  type LucideIcon,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTogether } from '@/hooks/useTogether';
import { showAlert } from '@/lib/dialog';
import { ActionSheet, Icon, Segmented, Text } from '@/components/atoms';
import { DoneCalendar } from '@/components/bucket/DoneCalendar';
import { DoneCard, DoneRow } from '@/components/bucket/DoneCard';
import {
  activeFilterCount,
  DoneFilterSheet,
  EMPTY_DONE_FILTER,
  matchesDoneFilter,
  type DoneFilter,
} from '@/components/bucket/DoneFilterSheet';
import { EmptyState } from '@/components/bucket/EmptyState';
import { useReviewCtx } from '@/hooks/useReviewCtx';
import { itemStatus, viewForMe } from '@/lib/bucket/reviews';
import { SyncEmpty, useListSync } from '@/components/bucket/SyncNotice';
import { ScreenHeader } from '@/components/bucket/ScreenHeader';
import {
  SelectionDeleteBar,
  SelectionHeader,
} from '@/components/bucket/SelectionBar';
import { SpaceSwitcher } from '@/components/space/SpaceSwitcher';
import type { BucketKind } from '@/lib/bucket/types';
import { KIND_ICON } from '@/components/bucket/kindIcons';
import type { SegmentedOption } from '@/components/atoms/Segmented';
import { useSelection } from '@/hooks/useSelection';
import { cn } from '@/lib/utils';
import { recapYear } from '@/lib/bucket/yearRecap';
import { countSpots } from '@/components/bucket/ItemsMap';
import { albumPhotos } from '@/lib/bucket/album';
import { useBucketStore } from '@/store/useBucketStore';
import { useSpace } from '@/store/useSpaceStore';
import { shareBucketItems } from '@/lib/shareItems';
import { type DoneView, useSettingsStore } from '@/store/useSettingsStore';
import { useTabBarSpace } from '@/hooks/useTabBarSpace';

type KindOption = 'all' | BucketKind;

/** 보기 방식 이름·아이콘 */
const VIEW_META: Record<DoneView, { label: string; icon: LucideIcon }> = {
  card: { label: '사진 크게 보기', icon: GalleryVertical },
  compact: { label: '간단히 보기', icon: List },
  calendar: { label: '달력으로 보기', icon: CalendarDays },
};

const KIND_OPTIONS: SegmentedOption<KindOption>[] = [
  { value: 'all', label: '전체' },
  { value: 'place', label: '탐방', icon: KIND_ICON.place },
  { value: 'activity', label: '도전', icon: CircleCheck },
];

export default function DoneScreen() {
  const items = useBucketStore((state) => state.items);
  // 공간 목록을 아직 못 받았으면 '없음' 대신 불러오는 중·다시 시도
  const sync = useListSync();
  const removeItems = useBucketStore((state) => state.removeItems);
  const clearDoneMany = useBucketStore((state) => state.clearDoneMany);
  const [kind, setKind] = useState<KindOption>('all');
  const together = useTogether();
  const placesLabel = together ? '함께한 곳' : '다녀온 곳';

  // 최근에 한 순
  // 공간에서는 내가 평가했거나 건너뛴 것만 (평가 전인 건 버킷리스트 맨 위에), 별점은 내 것으로
  const reviewCtx = useReviewCtx();
  const done = useMemo(
    () =>
      items
        .filter((it) => itemStatus(it, reviewCtx) === 'done')
        .map((it) => viewForMe(it, reviewCtx))
        .sort((a, b) => (b.done!.date > a.done!.date ? 1 : -1)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, reviewCtx.userId, reviewCtx.inSpace]
  );
  // 돌아볼 해 (1월엔 지난해). 기록이 없으면 띠를 숨긴다
  const recap = useMemo(() => recapYear(done, new Date()), [done]);
  // 지도에 찍을 수 있는 (장소를 골라둔) 기록 수
  // (체크한 할 것의 위치도 센다)
  const visitedCount = useMemo(() => countSpots(items, 'done'), [items]);
  // 기록에 올린 사진 수 (사진 모아보기 칸)
  const photoCount = useMemo(() => albumPhotos(items).length, [items]);
  // 종류만 거른 목록 (필터 시트에서 고를 수 있는 연도·카테고리를 여기서 뽑는다)
  const byKind = useMemo(
    () => (kind === 'all' ? done : done.filter((it) => it.kind === kind)),
    [done, kind]
  );
  const [filter, setFilter] = useState<DoneFilter>(EMPTY_DONE_FILTER);
  const [filterOpen, setFilterOpen] = useState(false);
  // 보기 모드 (사진 크게 / 간단히). 이 휴대폰에 기억한다
  const doneView = useSettingsStore((s) => s.doneView);
  const setDoneView = useSettingsStore((s) => s.setDoneView);
  const compact = doneView === 'compact';
  const [viewSheetOpen, setViewSheetOpen] = useState(false);
  const filterCount = activeFilterCount(filter);
  const shown = useMemo(
    () => byKind.filter((it) => matchesDoneFilter(it, filter)),
    [byKind, filter]
  );

  // 길게 눌러 여러 개 고르기 (보이는 카드 중에서만 센다)
  const selection = useSelection();
  const tabBarSpace = useTabBarSpace();
  // 목록 끝이 떠 있는 탭바(고르는 중엔 고르기 줄까지)에 가리지 않게
  const listBottom = tabBarSpace + (selection.selecting ? 88 : 24);
  const selectedIds = shown
    .filter((it) => selection.selected.has(it.id))
    .map((it) => it.id);
  const allSelected = shown.length > 0 && selectedIds.length === shown.length;

  // 고른 기록을 공유 코드로 (받는 사람에겐 새 버킷리스트로 담긴다)
  const [sharing, setSharing] = useState(false);
  const spaceId = useBucketStore((s) => s.spaceId);
  const currentSpaceName = useSpace(spaceId)?.name;
  const shareSelected = async () => {
    if (sharing || selectedIds.length === 0) return;
    const picked = shown.filter((it) => selection.selected.has(it.id));
    setSharing(true);
    try {
      await shareBucketItems(
        picked,
        currentSpaceName ? `${currentSpaceName}에서 해본 것` : '내가 해본 것'
      );
      selection.clear();
    } catch (e) {
      showAlert(e instanceof Error ? e.message : '공유하지 못했어요');
    } finally {
      setSharing(false);
    }
  };

  // 함께한 것에서 지울 때는 '기록만 지우기'(버킷리스트로 돌아감)와 '항목까지 지우기'를 고른다
  const confirmDelete = () =>
    showAlert(
      `${selectedIds.length}개를 어떻게 지울까요?`,
      "'기록만 지우기'를 고르면 버킷리스트로 다시 돌아가요.",
      [
        { text: '취소', style: 'cancel' },
        {
          text: '기록만 지우기',
          onPress: () => {
            clearDoneMany(selectedIds);
            selection.clear();
          },
        },
        {
          text: '항목까지 지우기',
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
              : selection.selectAll(shown.map((it) => it.id))
          }
        />
      ) : (
        <ScreenHeader
          right={<SpaceSwitcher />}
          title="차곡차곡 일지"
          subtitle={
            done.length > 0
              ? `벌써 ${done.length}개나 ${together ? '같이 ' : ''}해냈어요`
              : `${together ? '같이 ' : ''}해낸 것들이 여기에 차곡차곡 쌓여요`
          }
        />
      )}
      {/* 빈 화면은 목록 밖에 둬야 화면 가운데에 온다 (버킷리스트 탭과 같은 구조) */}
      {done.length === 0 && sync.kind !== 'ok' ? (
        <SyncEmpty sync={sync} />
      ) : done.length === 0 ? (
        <EmptyState
          title={together ? '아직 함께한 게 없어요' : '아직 해낸 게 없어요'}
          description={
            "버킷리스트에서 하나를 고르고\n'탐방 완료', '도전 성공'을 누르면 여기에 쌓여요."
          }
          actionLabel="버킷리스트 보러 가기"
          onAction={() => router.navigate('/')}
        />
      ) : (
        <>
          <View className="gap-3 px-5 pb-4">
            <View className="flex-row items-center gap-2">
              <View className="flex-1">
                <Segmented
                  options={KIND_OPTIONS}
                  value={kind}
                  onChange={setKind}
                />
              </View>
              {/* 보기 방식 고르기: 지금 방식의 아이콘 */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`보기 방식: ${VIEW_META[doneView].label}`}
                onPress={() => setViewSheetOpen(true)}
                className="h-10 w-10 items-center justify-center rounded-lg bg-accent active:opacity-70"
              >
                <Icon
                  as={VIEW_META[doneView].icon}
                  size={18}
                  className="text-muted-foreground"
                />
              </Pressable>
              {/* 필터: 켜진 조건 수를 배지로 */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  filterCount > 0 ? `필터 ${filterCount}개 적용 중` : '필터'
                }
                onPress={() => setFilterOpen(true)}
                className={cn(
                  'h-10 w-10 items-center justify-center rounded-lg active:opacity-70',
                  filterCount > 0 ? 'bg-primary' : 'bg-accent'
                )}
              >
                <Icon
                  as={SlidersHorizontal}
                  size={18}
                  className={
                    filterCount > 0
                      ? 'text-primary-foreground'
                      : 'text-muted-foreground'
                  }
                />
                {filterCount > 0 ? (
                  <View className="min-w-5 absolute -right-1.5 -top-1.5 h-5 items-center justify-center rounded-full border-2 border-primary bg-background px-1">
                    <Text size={10} weight="700" className="text-primary">
                      {filterCount}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            </View>
            {filterCount > 0 ? (
              <View className="flex-row items-center justify-between">
                <Text size={12} className="text-muted-foreground">
                  {`필터로 ${byKind.length}개 중 ${shown.length}개만 보고 있어요`}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => setFilter(EMPTY_DONE_FILTER)}
                >
                  <Text size={12} weight="600" className="text-primary">
                    필터 지우기
                  </Text>
                </Pressable>
              </View>
            ) : null}
            {/* 올해의 우리 돌아보기 (여러 개 고를 땐 숨긴다) */}
            {!selection.selecting && recap ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/done/year')}
                className="flex-row items-center gap-3 rounded-2xl bg-primary px-4 py-3 active:opacity-80"
              >
                <Icon
                  as={Sparkles}
                  size={20}
                  className="text-primary-foreground"
                />
                <View className="flex-1">
                  <Text
                    weight="700"
                    size={15}
                    className="text-primary-foreground"
                  >
                    {`${recap}년 ${together ? '우리 ' : ''}돌아보기`}
                  </Text>
                  <Text size={12} className="text-primary-foreground">
                    한 해 동안 해낸 것을 카드로 넘겨 봐요
                  </Text>
                </View>
                <Icon
                  as={ChevronRight}
                  size={18}
                  className="text-primary-foreground"
                />
              </Pressable>
            ) : null}
            {/* 지도·추억 모아보기 (여러 개 고를 땐 숨긴다) */}
            {!selection.selecting ? (
              <View className="flex-row gap-2">
                <ViewLink
                  icon={MapIcon}
                  label={
                    // 사진 칸까지 셋이면 짧게
                    photoCount > 0
                      ? visitedCount > 0
                        ? `지도 · ${visitedCount}곳`
                        : '지도'
                      : visitedCount > 0
                        ? `${placesLabel} 지도 · ${visitedCount}곳`
                        : `${placesLabel} 지도`
                  }
                  onPress={() => router.push('/done/map')}
                />
                {photoCount > 0 ? (
                  <ViewLink
                    icon={Images}
                    label={`사진 · ${photoCount}`}
                    onPress={() => router.push('/done/photos')}
                  />
                ) : null}
                <ViewLink
                  icon={ChartColumn}
                  label={photoCount > 0 ? '추억 통계' : '추억 모아보기'}
                  onPress={() => router.push('/done/stats')}
                />
              </View>
            ) : null}
          </View>
          {doneView === 'calendar' ? (
            <ScrollView
              contentContainerClassName="px-5"
              contentContainerStyle={{ paddingBottom: listBottom }}
            >
              <DoneCalendar
                items={shown}
                renderItem={(item) => (
                  <DoneRow
                    item={item}
                    selecting={selection.selecting}
                    selected={selection.selected.has(item.id)}
                    onLongPress={() => selection.start(item.id)}
                    onToggle={() => selection.toggle(item.id)}
                  />
                )}
              />
            </ScrollView>
          ) : (
            <FlatList
              data={shown}
              keyExtractor={(item) => item.id}
              extraData={selection.selected}
              renderItem={({ item }) => (
                <DoneItem
                  compact={compact}
                  item={item}
                  selecting={selection.selecting}
                  selected={selection.selected.has(item.id)}
                  onLongPress={() => selection.start(item.id)}
                  onToggle={() => selection.toggle(item.id)}
                />
              )}
              contentContainerClassName={cn(
                'px-5',
                compact ? 'gap-2' : 'gap-4'
              )}
              contentContainerStyle={{ paddingBottom: listBottom }}
              ListEmptyComponent={
                <EmptyState
                  title="여기엔 아직 없어요"
                  description={
                    filterCount > 0
                      ? '필터 조건을 바꿔봐요.'
                      : '다른 종류를 골라봐요.'
                  }
                />
              }
            />
          )}
          {selection.selecting ? (
            <SelectionDeleteBar
              count={selectedIds.length}
              onDelete={confirmDelete}
              label="지우기"
              secondaryLabel={
                sharing ? '만드는 중…' : `${selectedIds.length}개 공유하기`
              }
              onSecondary={() => void shareSelected()}
            />
          ) : null}
        </>
      )}
      <ActionSheet
        visible={viewSheetOpen}
        onClose={() => setViewSheetOpen(false)}
        header={
          <Text weight="700" size={17}>
            보기 방식
          </Text>
        }
        items={(Object.keys(VIEW_META) as DoneView[]).map((view) => ({
          label:
            view === doneView
              ? `${VIEW_META[view].label} (지금)`
              : VIEW_META[view].label,
          onPress: () => {
            selection.clear();
            setDoneView(view);
          },
        }))}
      />
      <DoneFilterSheet
        visible={filterOpen}
        items={byKind}
        value={filter}
        onApply={(next) => {
          selection.clear();
          setFilter(next);
        }}
        onClose={() => setFilterOpen(false)}
      />
    </SafeAreaView>
  );
}

/** 함께한 것 위의 작은 바로가기 버튼 (지도, 추억 모아보기) */
function ViewLink({
  icon,
  label,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-accent active:opacity-70"
    >
      <Icon as={icon} size={15} className="text-primary" />
      <Text size={13} weight="600" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** 보기 모드에 맞는 기록 한 칸 */
function DoneItem({
  compact,
  ...props
}: { compact: boolean } & React.ComponentProps<typeof DoneCard>) {
  return compact ? <DoneRow {...props} /> : <DoneCard {...props} />;
}
