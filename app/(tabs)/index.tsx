import dayjs from 'dayjs';
import { router } from 'expo-router';
import {
  ChevronRight,
  Download,
  Inbox,
  LayoutGrid,
  List,
  Map as MapIcon,
  Rows3,
  RotateCcw,
  Repeat as RepeatIcon,
  Search,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, SectionList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTogether } from '@/hooks/useTogether';
import { showAlert } from '@/lib/dialog';
import {
  ActionSheet,
  Chip,
  Fab,
  Icon,
  ProgressBar,
  Text,
  TextField,
} from '@/components/atoms';
import { BucketRow, BucketRowCompact } from '@/components/bucket/BucketRow';
import { useItemWants } from '@/hooks/useItemWants';
import { ItemIcon } from '@/components/bucket/ItemIcon';
import { hasMapSpot, ItemsMap } from '@/components/bucket/ItemsMap';
import {
  ALL_FILTER,
  CategoryFilter,
  matchesFilter,
  type BucketFilter,
} from '@/components/bucket/CategoryFilter';
import { AwaitingReviews } from '@/components/bucket/AwaitingReviews';
import { InProgressSection } from '@/components/bucket/InProgressSection';
import { EmptyState } from '@/components/bucket/EmptyState';
import {
  SyncEmpty,
  SyncStaleNotice,
  useListSync,
} from '@/components/bucket/SyncNotice';
import { ScreenHeader } from '@/components/bucket/ScreenHeader';
import {
  SelectionDeleteBar,
  SelectionHeader,
} from '@/components/bucket/SelectionBar';
import { SpaceSwitcher } from '@/components/space/SpaceSwitcher';
import { useSelection } from '@/hooks/useSelection';
import { useBucketStore } from '@/store/useBucketStore';
import { type BucketView, useSettingsStore } from '@/store/useSettingsStore';
import {
  CATEGORIES_BY_KIND,
  getCategory,
  isInProgress,
  isResting,
  type BucketItem,
} from '@/lib/bucket/types';
import { todayKey } from '@/lib/date';
import { cn } from '@/lib/utils';
import { useSpace, useSpaceStore } from '@/store/useSpaceStore';
import { shareBucketItems } from '@/lib/shareItems';
import { useImportSources } from '@/hooks/useImportSources';
import { useReviewCtx } from '@/hooks/useReviewCtx';
import {
  BUCKET_EXTRA_META,
  BUCKET_SORT_META,
  matchesExtras,
  matchesQuery,
  sortItems,
  type BucketExtra,
  type BucketSort,
} from '@/lib/bucket/search';
import { itemStatus } from '@/lib/bucket/reviews';
import { useTabBarSpace } from '@/hooks/useTabBarSpace';
import { CategoryIcon } from '@/components/bucket/CategoryIcon';

/** 보기 방식 이름·아이콘 */
const BUCKET_VIEW_META: Record<
  BucketView,
  { label: string; icon: LucideIcon }
> = {
  list: { label: '목록으로 보기', icon: Rows3 },
  compact: { label: '간단히 보기', icon: List },
  category: { label: '카테고리별로 보기', icon: LayoutGrid },
  map: { label: '지도로 보기', icon: MapIcon },
};

export default function BucketListScreen() {
  const together = useTogether();
  const doneLabel = together ? '함께한 것' : '해낸 것';
  const items = useBucketStore((state) => state.items);
  // 공간 목록을 아직 못 받았으면 '없음' 대신 불러오는 중·다시 시도
  const sync = useListSync();
  const removeItems = useBucketStore((state) => state.removeItems);
  const [filter, setFilter] = useState<BucketFilter>(ALL_FILTER);
  // 검색 (돋보기를 누르면 검색칸이 열린다)
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const bucketSort = useSettingsStore((s) => s.bucketSort);
  const setBucketSort = useSettingsStore((s) => s.setBucketSort);
  // 더 골라보기 (할 것 남은 것, 실내 등). 앱을 다시 켜면 풀린다
  const [extras, setExtras] = useState<BucketExtra[]>([]);
  const userId = useSpaceStore((s) => s.userId);
  // '나만 보기'에선 '내가 담은 것'을 빼고 센다
  const activeExtras = useMemo(
    () =>
      together ? extras : extras.filter((e) => !BUCKET_EXTRA_META[e].spaceOnly),
    [extras, together]
  );
  const toggleExtra = (extra: BucketExtra) =>
    setExtras((list) =>
      list.includes(extra) ? list.filter((e) => e !== extra) : [...list, extra]
    );
  const closeSearch = () => {
    setQuery('');
    setSearchOpen(false);
  };

  // 매년 하기 중 쉬는 것(내년에 다시 올라올 것)은 목록에서 빼고 아래 링크로
  const today = todayKey();
  const resting = useMemo(
    () => items.filter((it) => isResting(it, today)),
    [items, today]
  );
  const todo = useMemo(
    () => items.filter((it) => !it.done && !isResting(it, today)),
    [items, today]
  );
  const [restingOpen, setRestingOpen] = useState(false);
  // 공간에서 다른 사람이 먼저 기록해 내 평가를 기다리는 항목 (맨 위에 따로)
  const reviewCtx = useReviewCtx();
  const awaiting = items.filter(
    (it) => itemStatus(it, reviewCtx) === 'awaiting'
  );
  // '하고 싶어요' (함께 쓰는 공간에서만)
  const listSpaceId = useBucketStore((s) => s.spaceId);
  const wants = useItemWants(together ? listSpaceId : null);
  const filtered = useMemo(
    () =>
      sortItems(
        todo.filter(
          (it) =>
            matchesFilter(it, filter) &&
            matchesQuery(it, query) &&
            matchesExtras(it, activeExtras, userId)
        ),
        together || bucketSort !== 'wanted' ? bucketSort : 'recent',
        wants.countOf
      ),
    // wants.rows: 누가 누르면 'wanted' 정렬을 다시
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      todo,
      filter,
      query,
      activeExtras,
      userId,
      bucketSort,
      together,
      wants.rows,
    ]
  );
  /** 목록 한 줄의 '하고 싶어요' (함께 쓰는 공간에서만) */
  const wantOf = (item: BucketItem) =>
    together
      ? {
          count: wants.countOf(item.id),
          mine: wants.wantedByMe(item.id),
          onPress: () => void wants.toggle(item.id),
        }
      : undefined;
  const doneCount = items.length - todo.length - resting.length;
  const shownCount = items.length - resting.length;

  const goNew = () => router.push('/item/new');
  const goRedo = () => router.push('/item/redo');
  // 내가 공간장인 다른 공간(또는 나만 보기)에서 버킷리스트를 가져올 수 있는지
  const canImport = useImportSources().length > 0;
  const goImport = () => router.push('/item/import');
  const goShared = () => router.push('/item/shared');
  // 처음 깐 폰(공간도 담은 것도 없음)이면 쓰던 계정을 불러올 수 있게
  const isFreshStart = useSpaceStore(
    (s) => s.status === 'ready' && s.spaces.length === 0
  );

  // 길게 눌러 여러 개 고르기 (보이는 항목 중에서만 센다)
  const selection = useSelection();
  const tabBarSpace = useTabBarSpace();
  // 목록 끝이 떠 있는 탭바와 + 버튼(또는 고르기 줄)에 가리지 않게
  const listBottom = tabBarSpace + 88;
  const selectedIds = filtered
    .filter((it) => selection.selected.has(it.id))
    .map((it) => it.id);
  const allSelected =
    filtered.length > 0 && selectedIds.length === filtered.length;

  // 고른 항목을 공유 코드로 나눠주기 (사본만 넘어간다)
  const [sharing, setSharing] = useState(false);
  const spaceId = useBucketStore((s) => s.spaceId);
  const currentSpaceName = useSpace(spaceId)?.name;
  const shareSelected = async () => {
    if (sharing || selectedIds.length === 0) return;
    const picked = filtered.filter((it) => selection.selected.has(it.id));
    const title = currentSpaceName
      ? `${currentSpaceName} 버킷리스트`
      : '나의 버킷리스트';
    setSharing(true);
    try {
      await shareBucketItems(picked, title);
      selection.clear();
    } catch (e) {
      showAlert(e instanceof Error ? e.message : '공유하지 못했어요');
    } finally {
      setSharing(false);
    }
  };

  const confirmDelete = () =>
    showAlert(
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

  // 보기 방식 (목록 / 간단히 / 카테고리별 / 지도). 이 휴대폰에 기억한다
  const bucketView = useSettingsStore((s) => s.bucketView);
  const setBucketView = useSettingsStore((s) => s.setBucketView);
  const [viewSheetOpen, setViewSheetOpen] = useState(false);

  // 진행 중인 항목은 맨 위에 따로 모은다. 검색·고르기·지도에서는 목록에 그대로 섞는다
  const splitStarted =
    !selection.selecting && !query.trim() && bucketView !== 'map';
  const inProgress = useMemo(
    () => (splitStarted ? filtered.filter(isInProgress) : []),
    [filtered, splitStarted]
  );
  const listItems = useMemo(
    () =>
      splitStarted ? filtered.filter((it) => !isInProgress(it)) : filtered,
    [filtered, splitStarted]
  );

  // 카테고리별 보기: 카테고리 순서대로 묶는다 (가보기 → 해보기)
  const sections = useMemo(() => {
    const groups = new Map<string, BucketItem[]>();
    for (const it of listItems) {
      const key = `${it.kind}:${it.category}`;
      groups.set(key, [...(groups.get(key) ?? []), it]);
    }
    return (['place', 'activity'] as const).flatMap((kind) =>
      CATEGORIES_BY_KIND[kind]
        .filter((c) => groups.has(`${kind}:${c.key}`))
        .map((c) => ({
          key: `${kind}:${c.key}`,
          label: c.label,
          category: c.key,
          data: groups.get(`${kind}:${c.key}`)!,
        }))
    );
  }, [listItems]);

  const footer = !selection.selecting ? (
    <View className="flex-row flex-wrap items-center justify-center gap-x-5 gap-y-2 py-3">
      {doneCount > 0 ? (
        <FooterLink
          icon={RotateCcw}
          label={`${doneLabel} 다시 담기`}
          onPress={goRedo}
        />
      ) : null}
      {canImport ? (
        <FooterLink
          icon={Download}
          label="다른 공간에서 가져오기"
          onPress={goImport}
        />
      ) : null}
      <FooterLink
        icon={Inbox}
        label="공유받은 목록 가져오기"
        onPress={goShared}
      />
      {resting.length > 0 ? (
        <FooterLink
          icon={RepeatIcon}
          label={`내년에 다시 할 것 ${resting.length}개`}
          onPress={() => setRestingOpen(true)}
        />
      ) : null}
    </View>
  ) : undefined;
  // 평가를 기다리는 칸: 목록 맨 위에 넣어 같이 스크롤된다 (고르는 중에는 숨긴다)
  const showAwaiting = !selection.selecting && awaiting.length > 0;
  const awaitingHeader =
    showAwaiting || inProgress.length > 0 ? (
      <View className="gap-3">
        {showAwaiting ? (
          <AwaitingReviews items={awaiting} className="" />
        ) : null}
        <InProgressSection items={inProgress} />
      </View>
    ) : undefined;
  const listEmpty =
    activeExtras.length > 0 ? (
      <EmptyState
        title="고른 조건에 맞는 게 없어요"
        description="조건을 몇 개 빼보세요."
        actionLabel="조건 모두 빼기"
        onAction={() => setExtras([])}
      />
    ) : query.trim() ? (
      <EmptyState
        title={`'${query.trim()}'에 맞는 게 없어요`}
        description="다른 말로 찾아보거나 카테고리를 바꿔봐요."
      />
    ) : (
      <EmptyState
        title="여기엔 아직 없어요"
        description="다른 걸 골라보거나 새로 담아봐요."
      />
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
          title="우리의 버킷리스트"
          subtitle={
            items.length === 0
              ? `${together ? '같이 ' : ''}가고 싶은 곳, 해보고 싶은 것을 모아봐요`
              : `아직 ${todo.length}개가 기다리고 있어요`
          }
        />
      )}

      <SyncStaleNotice sync={sync} />

      {shownCount > 0 ? (
        <View className="mx-5 mb-4 gap-2 rounded-2xl p-4 bg-accent">
          <View className="flex-row items-center justify-between">
            <Text weight="600" size={15}>
              {shownCount}개 중 {doneCount}개 해냈어요
            </Text>
            {/* 해낸 게 있으면 '일지' 탭으로 바로 */}
            {doneCount > 0 ? (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="일지 보러가기"
                hitSlop={8}
                onPress={() => router.navigate('/done')}
                className="flex-row items-center active:opacity-60"
              >
                <Text weight="600" size={13} className="text-primary">
                  보러가기
                </Text>
                <Icon as={ChevronRight} size={16} className="text-primary" />
              </Pressable>
            ) : null}
          </View>
          <ProgressBar value={(doneCount / Math.max(shownCount, 1)) * 100} />
        </View>
      ) : null}

      {items.length === 0 && sync.kind !== 'ok' ? (
        <SyncEmpty sync={sync} />
      ) : todo.length === 0 ? (
        <>
          {showAwaiting ? <AwaitingReviews items={awaiting} /> : null}
          <EmptyState
            title={
              items.length === 0
                ? '아직 담은 게 없어요'
                : '버킷리스트를 다 해냈어요!'
            }
            description={
              items.length === 0
                ? `맛집, 여행지도 좋고\n${together ? '같이 ' : ''}요리하기, 사진 찍기도 좋아요.`
                : `다음에 ${together ? '같이 ' : ''}할 걸 또 담아봐요.`
            }
            actionLabel={
              items.length === 0 ? '첫 버킷리스트 담기' : '새로 담기'
            }
            onAction={goNew}
            // 해본 게 있으면 여러 개 골라 한 번에 다시 담을 수 있다.
            // 처음 깐 폰이면 대신 쓰던 계정 불러오기
            secondaryLabel={
              doneCount > 0
                ? `${doneLabel} 다시 담기`
                : canImport
                  ? '다른 공간에서 가져오기'
                  : items.length === 0 && isFreshStart
                    ? '다른 폰에서 쓰던 계정 불러오기'
                    : '공유받은 목록 가져오기'
            }
            onSecondary={
              doneCount > 0
                ? goRedo
                : canImport
                  ? goImport
                  : items.length === 0 && isFreshStart
                    ? () => router.push('/account/restore')
                    : goShared
            }
          />
        </>
      ) : (
        <>
          <CategoryFilter
            value={filter}
            onChange={setFilter}
            right={
              <View className="flex-row gap-2">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={searchOpen ? '검색 닫기' : '검색'}
                  onPress={() =>
                    searchOpen ? closeSearch() : setSearchOpen(true)
                  }
                  className={cn(
                    'h-10 w-10 items-center justify-center rounded-lg active:opacity-70',
                    searchOpen ? 'bg-primary' : 'bg-accent'
                  )}
                >
                  <Icon
                    as={Search}
                    size={18}
                    className={
                      searchOpen
                        ? 'text-primary-foreground'
                        : 'text-muted-foreground'
                    }
                  />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`보기 방식·정렬·골라보기: ${BUCKET_VIEW_META[bucketView].label}${activeExtras.length > 0 ? `, 조건 ${activeExtras.length}개` : ''}`}
                  onPress={() => setViewSheetOpen(true)}
                  className="h-10 w-10 items-center justify-center rounded-lg bg-accent active:opacity-70"
                >
                  <Icon
                    as={BUCKET_VIEW_META[bucketView].icon}
                    size={18}
                    className="text-muted-foreground"
                  />
                  {activeExtras.length > 0 ? (
                    <View className="min-w-5 absolute -right-1 -top-1 h-5 items-center justify-center rounded-full bg-primary px-1">
                      <Text
                        weight="700"
                        size={11}
                        className="text-primary-foreground"
                      >
                        {activeExtras.length}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              </View>
            }
          />
          {searchOpen ? (
            <View className="flex-row items-center gap-2 px-5 pt-3">
              <View className="flex-1">
                <TextField
                  variant="search"
                  value={query}
                  onChangeText={setQuery}
                  placeholder="제목, 메모, 장소로 찾기"
                  autoFocus
                  returnKeyType="search"
                />
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={closeSearch}
                hitSlop={8}
                className="px-1 active:opacity-60"
              >
                <Text weight="600" size={14} className="text-muted-foreground">
                  닫기
                </Text>
              </Pressable>
            </View>
          ) : null}
          {activeExtras.length > 0 ? (
            <View className="flex-row flex-wrap items-center gap-2 px-5 pt-3">
              <Icon
                as={SlidersHorizontal}
                size={14}
                className="text-muted-foreground"
              />
              {activeExtras.map((extra) => (
                <Pressable
                  key={extra}
                  accessibilityRole="button"
                  accessibilityLabel={`${BUCKET_EXTRA_META[extra].label} 조건 빼기`}
                  onPress={() => toggleExtra(extra)}
                  className="h-8 flex-row items-center gap-1 rounded-full bg-primary pl-3 pr-2 active:opacity-70"
                >
                  <Text
                    weight="600"
                    size={12}
                    className="text-primary-foreground"
                  >
                    {BUCKET_EXTRA_META[extra].label}
                  </Text>
                  <Icon as={X} size={13} className="text-primary-foreground" />
                </Pressable>
              ))}
              <Pressable
                accessibilityRole="button"
                hitSlop={6}
                onPress={() => setExtras([])}
                className="px-1 active:opacity-60"
              >
                <Text weight="600" size={12} className="text-muted-foreground">
                  모두 빼기
                </Text>
              </Pressable>
            </View>
          ) : null}
          {bucketView === 'map' && awaiting.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setBucketView('list')}
              className="mx-5 mt-3 flex-row items-center justify-between rounded-xl px-4 py-2.5 bg-accent active:opacity-70"
            >
              <Text weight="600" size={13}>
                평가를 기다려요 · {awaiting.length}
              </Text>
              <Text weight="600" size={13} className="text-primary">
                목록에서 보기
              </Text>
            </Pressable>
          ) : null}
          {bucketView === 'map' ? (
            <View className="mt-3 flex-1">
              {hasMapSpot(filtered, true) ? (
                <ItemsMap
                  items={filtered}
                  withTodos
                  renderItem={(item) => <MapItemCard item={item} />}
                  groupTitle={(group, placeName) =>
                    `${placeName || '이곳'}에 ${group.length}개 담겨 있어요`
                  }
                  hint="핀을 누르면 그곳에 담아둔 걸 볼 수 있어요"
                  bottomInset={tabBarSpace}
                />
              ) : (
                <EmptyState
                  title="지도에 찍을 곳이 없어요"
                  description={'담을 때 장소를 골라두면\n여기에 핀으로 모여요.'}
                />
              )}
            </View>
          ) : bucketView === 'category' ? (
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              extraData={{ selected: selection.selected, wants: wants.rows }}
              stickySectionHeadersEnabled={false}
              renderSectionHeader={({ section }) => (
                <View className="flex-row items-center gap-1.5 pb-1 pt-4">
                  <CategoryIcon category={section.category} size={16} />
                  <Text weight="700" size={14}>
                    {section.label}
                    <Text size={12} className="text-muted-foreground">
                      {` · ${section.data.length}`}
                    </Text>
                  </Text>
                </View>
              )}
              renderItem={({ item }) => (
                <View className="pb-2">
                  <BucketRowCompact
                    item={item}
                    want={wantOf(item)}
                    selecting={selection.selecting}
                    selected={selection.selected.has(item.id)}
                    onLongPress={() => selection.start(item.id)}
                    onToggle={() => selection.toggle(item.id)}
                  />
                </View>
              )}
              contentContainerClassName="px-5"
              contentContainerStyle={{ paddingBottom: listBottom }}
              ListHeaderComponent={
                awaitingHeader ? (
                  <View className="pt-4">{awaitingHeader}</View>
                ) : undefined
              }
              ListFooterComponent={footer}
              ListEmptyComponent={inProgress.length > 0 ? undefined : listEmpty}
            />
          ) : (
            <FlatList
              data={listItems}
              keyExtractor={(item) => item.id}
              extraData={{ selected: selection.selected, wants: wants.rows }}
              renderItem={({ item }) => (
                <BucketItemRow
                  compact={bucketView === 'compact'}
                  item={item}
                  want={wantOf(item)}
                  selecting={selection.selecting}
                  selected={selection.selected.has(item.id)}
                  onLongPress={() => selection.start(item.id)}
                  onToggle={() => selection.toggle(item.id)}
                />
              )}
              contentContainerClassName={cn(
                'px-5 pt-4',
                bucketView === 'compact' ? 'gap-2' : 'gap-3'
              )}
              contentContainerStyle={{ paddingBottom: listBottom }}
              ListHeaderComponent={awaitingHeader}
              ListFooterComponent={footer}
              ListEmptyComponent={inProgress.length > 0 ? undefined : listEmpty}
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
          ) : bucketView === 'map' ? null : (
            <View
              className="absolute right-5"
              style={{ bottom: tabBarSpace + 12 }}
            >
              <Fab accessibilityLabel="버킷리스트 담기" onPress={goNew} />
            </View>
          )}
        </>
      )}
      <ActionSheet
        visible={restingOpen}
        onClose={() => setRestingOpen(false)}
        header={
          <View className="gap-1">
            <Text weight="700" size={17}>
              내년에 다시 할 것
            </Text>
            <Text variant="muted" size={13}>
              매년 하기로 담은 것 중 올해 해낸 것들이에요. 날이 되면 목록에 다시
              올라와요.
            </Text>
          </View>
        }
        items={resting.map((it) => ({
          label: `${it.title} · ${dayjs(it.repeat?.restUntil).format('M월 D일')}부터`,
          onPress: () =>
            router.push({ pathname: '/item/[id]', params: { id: it.id } }),
        }))}
      />
      <ActionSheet
        visible={viewSheetOpen}
        onClose={() => setViewSheetOpen(false)}
        header={
          <View className="gap-4">
            <View className="gap-2">
              <Text weight="700" size={17}>
                정렬
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {(Object.keys(BUCKET_SORT_META) as BucketSort[])
                  .filter(
                    (sort) => together || !BUCKET_SORT_META[sort].spaceOnly
                  )
                  .map((sort) => (
                    <Chip
                      key={sort}
                      label={BUCKET_SORT_META[sort].label}
                      selected={sort === bucketSort}
                      onPress={() => setBucketSort(sort)}
                    />
                  ))}
              </View>
            </View>
            <View className="gap-2">
              <Text weight="700" size={17}>
                골라보기
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {(Object.keys(BUCKET_EXTRA_META) as BucketExtra[])
                  .filter((e) => together || !BUCKET_EXTRA_META[e].spaceOnly)
                  .map((extra) => (
                    <Chip
                      key={extra}
                      label={BUCKET_EXTRA_META[extra].label}
                      selected={activeExtras.includes(extra)}
                      onPress={() => toggleExtra(extra)}
                    />
                  ))}
              </View>
            </View>
            <Text weight="700" size={17}>
              보기 방식
            </Text>
          </View>
        }
        items={(Object.keys(BUCKET_VIEW_META) as BucketView[]).map((view) => ({
          label:
            view === bucketView
              ? `${BUCKET_VIEW_META[view].label} (지금)`
              : BUCKET_VIEW_META[view].label,
          onPress: () => {
            selection.clear();
            setBucketView(view);
          },
        }))}
      />
    </SafeAreaView>
  );
}

/** 보기 방식에 맞는 한 줄 */
function BucketItemRow({
  compact,
  ...props
}: { compact: boolean } & React.ComponentProps<typeof BucketRow>) {
  return compact ? <BucketRowCompact {...props} /> : <BucketRow {...props} />;
}

/** 지도에서 핀을 눌렀을 때 보이는 항목. 누르면 항목 화면으로 */
function MapItemCard({ item }: { item: BucketItem }) {
  const category = getCategory(item.category);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        router.push({ pathname: '/item/[id]', params: { id: item.id } })
      }
      className="flex-row items-center gap-3 active:opacity-70"
    >
      <ItemIcon item={item} size={44} iconSize={20} />
      <View className="flex-1 gap-0.5">
        <Text weight="700" size={15} numberOfLines={1}>
          {item.title}
        </Text>
        <Text variant="muted" size={12} numberOfLines={1}>
          {[category.label, item.place?.name].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
    </Pressable>
  );
}

/** 목록 아래 작은 회색 링크 (다시 담기, 가져오기) */
function FooterLink({
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
      hitSlop={6}
      onPress={onPress}
      className="flex-row items-center gap-1 active:opacity-60"
    >
      <Icon as={icon} size={12} className="text-muted-foreground" />
      <Text size={12} className="text-muted-foreground">
        {label}
      </Text>
    </Pressable>
  );
}
