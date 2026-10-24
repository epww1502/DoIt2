import {
  ChartColumn,
  CircleCheck,
  GalleryVertical,
  List,
  Map as MapIcon,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert } from '@/lib/dialog';
import { Icon, Segmented, Text } from '@/components/atoms';
import { DoneCard, DoneRow } from '@/components/bucket/DoneCard';
import {
  activeFilterCount,
  DoneFilterSheet,
  EMPTY_DONE_FILTER,
  matchesDoneFilter,
  type DoneFilter,
} from '@/components/bucket/DoneFilterSheet';
import { EmptyState } from '@/components/bucket/EmptyState';
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
import { useBucketStore } from '@/store/useBucketStore';
import { useSettingsStore } from '@/store/useSettingsStore';

type KindOption = 'all' | BucketKind;

const KIND_OPTIONS: SegmentedOption<KindOption>[] = [
  { value: 'all', label: '전체' },
  { value: 'place', label: '가본 곳', icon: KIND_ICON.place },
  { value: 'activity', label: '해본 것', icon: CircleCheck },
];

export default function DoneScreen() {
  const items = useBucketStore((state) => state.items);
  const removeItems = useBucketStore((state) => state.removeItems);
  const clearDoneMany = useBucketStore((state) => state.clearDoneMany);
  const [kind, setKind] = useState<KindOption>('all');

  // 최근에 한 순
  const done = useMemo(
    () =>
      items
        .filter((it) => it.done)
        .sort((a, b) => (b.done!.date > a.done!.date ? 1 : -1)),
    [items]
  );
  // 지도에 찍을 수 있는 (장소를 골라둔) 기록 수
  const visitedCount = done.filter((it) => it.place).length;
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
  const filterCount = activeFilterCount(filter);
  const shown = useMemo(
    () => byKind.filter((it) => matchesDoneFilter(it, filter)),
    [byKind, filter]
  );

  // 길게 눌러 여러 개 고르기 (보이는 카드 중에서만 센다)
  const selection = useSelection();
  const selectedIds = shown
    .filter((it) => selection.selected.has(it.id))
    .map((it) => it.id);
  const allSelected = shown.length > 0 && selectedIds.length === shown.length;

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
          title="함께한 것"
          subtitle={
            done.length > 0
              ? `벌써 ${done.length}개나 같이 해냈어요`
              : '같이 해낸 것들이 여기에 차곡차곡 쌓여요'
          }
        />
      )}
      {/* 빈 화면은 목록 밖에 둬야 화면 가운데에 온다 (버킷리스트 탭과 같은 구조) */}
      {done.length === 0 ? (
        <EmptyState
          title="아직 함께한 게 없어요"
          description={
            "버킷리스트에서 하나를 고르고\n'가봤어요', '해봤어요'를 누르면 여기에 쌓여요."
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
              {/* 보기 모드 바꾸기: 지금 모드가 아닌 쪽 아이콘을 보여준다 */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={compact ? '사진 크게 보기' : '간단히 보기'}
                onPress={() => setDoneView(compact ? 'card' : 'compact')}
                className="h-10 w-10 items-center justify-center rounded-lg bg-accent active:opacity-70"
              >
                <Icon
                  as={compact ? GalleryVertical : List}
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
                  <View className="min-w-5 absolute -right-1.5 -top-1.5 h-5 items-center justify-center rounded-full border-2 border-primary px-1 bg-background">
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
            {/* 지도·추억 모아보기 (여러 개 고를 땐 숨긴다) */}
            {!selection.selecting ? (
              <View className="flex-row gap-2">
                <ViewLink
                  icon={MapIcon}
                  label={
                    visitedCount > 0
                      ? `함께한 곳 지도 · ${visitedCount}곳`
                      : '함께한 곳 지도'
                  }
                  onPress={() => router.push('/done/map')}
                />
                <ViewLink
                  icon={ChartColumn}
                  label="추억 모아보기"
                  onPress={() => router.push('/done/stats')}
                />
              </View>
            ) : null}
          </View>
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
              compact ? 'gap-2' : 'gap-4',
              selection.selecting ? 'pb-28' : 'pb-10'
            )}
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
          {selection.selecting ? (
            <SelectionDeleteBar
              count={selectedIds.length}
              onDelete={confirmDelete}
            />
          ) : null}
        </>
      )}
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
