import { router } from 'expo-router';
import { ChevronDown, ChevronUp, Crown } from 'lucide-react-native';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert } from '@/lib/dialog';
import { Button, Icon, NavBar, Text } from '@/components/atoms';
import { EmptyState } from '@/components/bucket/EmptyState';
import { Selectable } from '@/components/bucket/Selectable';
import {
  SelectionDeleteBar,
  SelectionHeader,
} from '@/components/bucket/SelectionBar';
import { SpaceAvatar } from '@/components/space/SpaceAvatar';
import {
  confirmLeaveSpace,
  confirmLeaveSpaces,
} from '@/components/space/spaceFlow';
import { useSelection } from '@/hooks/useSelection';
import { cn } from '@/lib/utils';
import { useBucketStore } from '@/store/useBucketStore';
import { usePrimaryColor } from '@/store/useSettingsStore';
import { type Space, useSpaceStore } from '@/store/useSpaceStore';

/** 내 공간 전체 관리: 보이는 순서 바꾸기, 편집, 바로 나가기. 길게 누르면 여러 개 골라 나가기 */
export default function SpaceListScreen() {
  const spaces = useSpaceStore((s) => s.spaces);
  const userId = useSpaceStore((s) => s.userId);
  const currentId = useBucketStore((s) => s.spaceId);
  const selection = useSelection();

  /** index번째 공간을 위(-1)·아래(+1)로 한 칸 옮긴다 */
  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= spaces.length) return;
    const ids = spaces.map((s) => s.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    useSpaceStore
      .getState()
      .reorderSpaces(ids)
      .catch((e: unknown) =>
        showAlert(e instanceof Error ? e.message : '순서를 바꾸지 못했어요')
      );
  };

  const edit = (space: Space) =>
    router.push({ pathname: '/space', params: { id: space.id } });

  const leaveSelected = () =>
    confirmLeaveSpaces(
      spaces.filter((s) => selection.selected.has(s.id)),
      selection.clear
    );

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      {selection.selecting ? (
        <SelectionHeader
          count={selection.selected.size}
          allSelected={selection.selected.size === spaces.length}
          onCancel={selection.clear}
          onToggleAll={() =>
            selection.selected.size === spaces.length
              ? selection.clear()
              : selection.selectAll(spaces.map((s) => s.id))
          }
        />
      ) : (
        <NavBar title="내 공간" />
      )}
      {spaces.length === 0 ? (
        <EmptyState
          title="아직 들어간 공간이 없어요"
          description="공간을 만들거나 초대 코드로 들어가면 여기서 관리할 수 있어요."
          actionLabel="새 공간 만들기"
          onAction={() => router.replace('/space/new')}
          secondaryLabel="초대 코드로 들어가기"
          onSecondary={() => router.replace('/space/join')}
        />
      ) : (
        <ScrollView
          contentContainerClassName={cn(
            'gap-2 px-5 pt-2',
            selection.selecting ? 'pb-28' : 'pb-8'
          )}
        >
          <Text size={12} className="mb-1 text-muted-foreground">
            {selection.selecting
              ? '나갈 공간을 골라주세요'
              : '화살표로 순서를 바꾸고, 길게 누르면 여러 개를 골라 나갈 수 있어요'}
          </Text>
          {spaces.map((space, index) => (
            <Selectable
              key={space.id}
              selecting={selection.selecting}
              selected={selection.selected.has(space.id)}
              onPress={() => edit(space)}
              onLongPress={() => selection.start(space.id)}
              onToggle={() => selection.toggle(space.id)}
              className="rounded-2xl bg-accent"
            >
              <SpaceManageRow
                space={space}
                selecting={selection.selecting}
                isOwner={space.owner_id === userId}
                isCurrent={space.id === currentId}
                isFirst={index === 0}
                isLast={index === spaces.length - 1}
                onUp={() => move(index, -1)}
                onDown={() => move(index, 1)}
                onEdit={() => edit(space)}
                onLeave={() => confirmLeaveSpace(space)}
              />
            </Selectable>
          ))}
          {!selection.selecting ? (
            <View className="mt-4 gap-2">
              <Button
                label="새 공간 만들기"
                variant="outline"
                size="md"
                onPress={() => router.push('/space/new')}
              />
              <Button
                label="초대 코드로 들어가기"
                variant="ghost"
                size="md"
                onPress={() => router.push('/space/join')}
              />
            </View>
          ) : null}
        </ScrollView>
      )}
      {selection.selecting ? (
        <SelectionDeleteBar
          count={selection.selected.size}
          label={`${selection.selected.size}개 공간에서 나가기`}
          onDelete={leaveSelected}
        />
      ) : null}
    </SafeAreaView>
  );
}

function SpaceManageRow({
  space,
  selecting,
  isOwner,
  isCurrent,
  isFirst,
  isLast,
  onUp,
  onDown,
  onEdit,
  onLeave,
}: {
  space: Space;
  selecting: boolean;
  isOwner: boolean;
  isCurrent: boolean;
  isFirst: boolean;
  isLast: boolean;
  onUp: () => void;
  onDown: () => void;
  onEdit: () => void;
  onLeave: () => void;
}) {
  const primary = usePrimaryColor();
  return (
    <View
      className={cn(
        'min-h-[72px] flex-row items-center gap-3 py-3 pr-4',
        selecting ? 'pl-4 pr-12' : 'pl-2'
      )}
    >
      {/* 순서 바꾸기 (여러 개 고를 땐 숨긴다) */}
      {!selecting ? (
        <View>
          <ArrowButton
            icon={ChevronUp}
            label={`${space.name} 위로`}
            disabled={isFirst}
            onPress={onUp}
          />
          <ArrowButton
            icon={ChevronDown}
            label={`${space.name} 아래로`}
            disabled={isLast}
            onPress={onDown}
          />
        </View>
      ) : null}

      <SpaceAvatar emoji={space.emoji} imagePath={space.image_path} size={40} />
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center gap-1">
          {isOwner ? (
            <Icon
              as={Crown}
              size={13}
              className="text-primary"
              fill={primary}
              accessibilityLabel="내가 공간장"
            />
          ) : null}
          <Text weight="600" size={15} numberOfLines={1} className="shrink">
            {space.name}
          </Text>
        </View>
        <Text size={12} className="text-muted-foreground">
          {isCurrent
            ? `${space.is_personal ? '개인 공간' : `${space.memberCount}명`} · 보고 있는 공간`
            : space.is_personal
              ? '개인 공간'
              : `${space.memberCount}명`}
        </Text>
      </View>

      {/* 편집·나가기: 같은 크기 버튼을 나란히 */}
      {!selecting ? (
        <View className="flex-row items-center gap-1.5">
          <RowButton label="편집" onPress={onEdit} primary />
          <RowButton label="나가기" onPress={onLeave} />
        </View>
      ) : null}
    </View>
  );
}

function RowButton({
  label,
  onPress,
  primary,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={4}
      onPress={onPress}
      className="h-8 items-center justify-center rounded-full px-3 bg-background active:opacity-70"
    >
      <Text
        size={13}
        weight="600"
        className={primary ? 'text-primary' : 'text-muted-foreground'}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ArrowButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: typeof ChevronUp;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      className={cn('p-1 active:opacity-50', disabled && 'opacity-25')}
    >
      <Icon as={icon} size={18} className="text-muted-foreground" />
    </Pressable>
  );
}
