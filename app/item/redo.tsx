import dayjs from 'dayjs';
import { router } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Icon, NavBar, Text } from '@/components/atoms';
import { BottomBar } from '@/components/bucket/BottomBar';
import { EmptyState } from '@/components/bucket/EmptyState';
import { hapticSelect, hapticSuccess } from '@/lib/haptics';
import {
  getCategory,
  type BucketInput,
  type BucketItem,
} from '@/lib/bucket/types';
import { cn } from '@/lib/utils';
import { useBucketStore } from '@/store/useBucketStore';

/** 같은 걸 이미 담아 뒀는지 비교할 때 쓰는 열쇠 */
const sameKey = (it: Pick<BucketItem, 'kind' | 'title'>) =>
  `${it.kind}:${it.title.trim()}`;

/** 해본 것을 그대로 새 항목으로 (기록은 '함께한 것'에 남는다) */
function toInput(it: BucketItem): BucketInput {
  return {
    kind: it.kind,
    title: it.title,
    category: it.category,
    setting: it.setting,
    location: it.location,
    place: it.place ?? null,
    memo: it.memo,
  };
}

/** 해본 것 다시 담기: 함께한 것 중에서 여러 개 골라 버킷리스트에 한 번에 다시 담는다 */
export default function RedoScreen() {
  const items = useBucketStore((s) => s.items);
  const addItems = useBucketStore((s) => s.addItems);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  // 최근에 한 순
  const done = useMemo(
    () =>
      items
        .filter((it) => it.done)
        .sort((a, b) => (b.done!.date > a.done!.date ? 1 : -1)),
    [items]
  );
  // 이미 버킷리스트에 같은 게 있으면 또 담지 않게 막는다
  const todoKeys = useMemo(
    () => new Set(items.filter((it) => !it.done).map(sameKey)),
    [items]
  );
  const selectable = done.filter((it) => !todoKeys.has(sameKey(it)));
  const allSelected =
    selectable.length > 0 && selectable.every((it) => selected.has(it.id));

  const toggle = (id: string) => {
    hapticSelect();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () =>
    setSelected(
      allSelected ? new Set() : new Set(selectable.map((it) => it.id))
    );

  const redo = () => {
    // 화면에 보이는 순서(최근에 한 순) 그대로 담는다
    const picked = done.filter((it) => selected.has(it.id));
    addItems(picked.map(toInput));
    hapticSuccess();
    router.back();
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar
        title="해본 것 다시 담기"
        right={
          selectable.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={toggleAll}
            >
              <Text weight="600" size={14} className="text-primary">
                {allSelected ? '선택 해제' : '전체 선택'}
              </Text>
            </Pressable>
          ) : null
        }
      />
      {done.length === 0 ? (
        <EmptyState
          emoji="👣"
          title="아직 해본 게 없어요"
          description="함께한 기록이 생기면 여기서 다시 담을 수 있어요."
        />
      ) : (
        <>
          <Text variant="muted" size={13} className="px-5 pb-3">
            고른 것들이 버킷리스트에 새로 담겨요. 함께한 기록은 그대로 남아요.
          </Text>
          <FlatList
            data={done}
            keyExtractor={(it) => it.id}
            extraData={selected}
            contentContainerClassName="gap-2 px-5 pb-8"
            renderItem={({ item }) => {
              const already = todoKeys.has(sameKey(item));
              const isSelected = selected.has(item.id);
              const category = getCategory(item.category);
              return (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{
                    checked: isSelected,
                    disabled: already,
                  }}
                  disabled={already}
                  onPress={() => toggle(item.id)}
                  className={cn(
                    'flex-row items-center gap-3 rounded-2xl border p-4 bg-card',
                    isSelected ? 'border-2 border-primary' : 'border-border',
                    already && 'opacity-50'
                  )}
                >
                  <View className="h-11 w-11 items-center justify-center rounded-full bg-accent">
                    <Text size={20}>{category.emoji}</Text>
                  </View>
                  <View className="flex-1 gap-0.5">
                    <Text weight="600" size={15} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text variant="muted" size={12} numberOfLines={1}>
                      {already
                        ? '이미 버킷리스트에 있어요'
                        : `${dayjs(item.done!.date).format('YYYY년 M월 D일')}에 함께했어요`}
                    </Text>
                  </View>
                  <View
                    className={cn(
                      'h-7 w-7 items-center justify-center rounded-full border-2',
                      isSelected
                        ? 'border-primary bg-primary'
                        : 'bg-background border-muted'
                    )}
                  >
                    {isSelected ? (
                      <Icon
                        as={Check}
                        size={16}
                        className="text-primary-foreground"
                      />
                    ) : null}
                  </View>
                </Pressable>
              );
            }}
          />
          <BottomBar>
            <Button
              label={
                selected.size > 0
                  ? `${selected.size}개 다시 담기`
                  : '다시 담을 걸 골라주세요'
              }
              disabled={selected.size === 0}
              onPress={redo}
            />
          </BottomBar>
        </>
      )}
    </SafeAreaView>
  );
}
