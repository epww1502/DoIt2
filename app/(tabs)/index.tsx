import { router } from 'expo-router';
import {
  ChevronRight,
  Download,
  Inbox,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTogether } from '@/hooks/useTogether';
import { showAlert } from '@/lib/dialog';
import { Fab, Icon, ProgressBar, Text } from '@/components/atoms';
import { BucketRow } from '@/components/bucket/BucketRow';
import {
  ALL_FILTER,
  CategoryFilter,
  matchesFilter,
  type BucketFilter,
} from '@/components/bucket/CategoryFilter';
import { EmptyState } from '@/components/bucket/EmptyState';
import { ScreenHeader } from '@/components/bucket/ScreenHeader';
import {
  SelectionDeleteBar,
  SelectionHeader,
} from '@/components/bucket/SelectionBar';
import { SpaceSwitcher } from '@/components/space/SpaceSwitcher';
import { useSelection } from '@/hooks/useSelection';
import { useBucketStore } from '@/store/useBucketStore';
import { useSpace, useSpaceStore } from '@/store/useSpaceStore';
import { shareBucketItems } from '@/lib/shareItems';
import { useImportSources } from '@/hooks/useImportSources';

export default function BucketListScreen() {
  const together = useTogether();
  const doneLabel = together ? '함께한 것' : '해낸 것';
  const items = useBucketStore((state) => state.items);
  const removeItems = useBucketStore((state) => state.removeItems);
  const [filter, setFilter] = useState<BucketFilter>(ALL_FILTER);

  const todo = useMemo(() => items.filter((it) => !it.done), [items]);
  const filtered = useMemo(
    () => todo.filter((it) => matchesFilter(it, filter)),
    [todo, filter]
  );
  const doneCount = items.length - todo.length;

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
          title="버킷리스트"
          subtitle={
            items.length === 0
              ? `${together ? '같이 ' : ''}가고 싶은 곳, 해보고 싶은 것을 모아봐요`
              : `아직 ${todo.length}개가 기다리고 있어요`
          }
        />
      )}

      {items.length > 0 ? (
        <View className="mx-5 mb-4 gap-2 rounded-2xl p-4 bg-accent">
          <View className="flex-row items-center justify-between">
            <Text weight="600" size={15}>
              {items.length}개 중 {doneCount}개 해냈어요
            </Text>
            {/* 해낸 게 있으면 '함께한 것' 탭으로 바로 */}
            {doneCount > 0 ? (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`${doneLabel} 보러가기`}
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
          <ProgressBar value={(doneCount / items.length) * 100} />
        </View>
      ) : null}

      {todo.length === 0 ? (
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
          actionLabel={items.length === 0 ? '첫 버킷리스트 담기' : '새로 담기'}
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
      ) : (
        <>
          <CategoryFilter value={filter} onChange={setFilter} />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            extraData={selection.selected}
            renderItem={({ item }) => (
              <BucketRow
                item={item}
                selecting={selection.selecting}
                selected={selection.selected.has(item.id)}
                onLongPress={() => selection.start(item.id)}
                onToggle={() => selection.toggle(item.id)}
              />
            )}
            contentContainerClassName="gap-3 px-5 pb-28 pt-4"
            ListFooterComponent={
              !selection.selecting ? (
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
                </View>
              ) : undefined
            }
            ListEmptyComponent={
              <EmptyState
                title="여기엔 아직 없어요"
                description="다른 걸 골라보거나 새로 담아봐요."
              />
            }
          />
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
          ) : (
            <View className="absolute bottom-6 right-5">
              <Fab accessibilityLabel="버킷리스트 담기" onPress={goNew} />
            </View>
          )}
        </>
      )}
    </SafeAreaView>
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
