import {
  ChartColumn,
  CircleCheck,
  Map as MapIcon,
  type LucideIcon,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert } from '@/lib/dialog';
import { Icon, Segmented, Text } from '@/components/atoms';
import { DoneCard } from '@/components/bucket/DoneCard';
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
import { useBucketStore } from '@/store/useBucketStore';

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
  const shown = useMemo(
    () => (kind === 'all' ? done : done.filter((it) => it.kind === kind)),
    [done, kind]
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
            <Segmented options={KIND_OPTIONS} value={kind} onChange={setKind} />
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
              <DoneCard
                item={item}
                selecting={selection.selecting}
                selected={selection.selected.has(item.id)}
                onLongPress={() => selection.start(item.id)}
                onToggle={() => selection.toggle(item.id)}
              />
            )}
            contentContainerClassName={
              selection.selecting ? 'gap-4 px-5 pb-28' : 'gap-4 px-5 pb-10'
            }
            ListEmptyComponent={
              <EmptyState
                title="여기엔 아직 없어요"
                description="다른 종류를 골라봐요."
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
