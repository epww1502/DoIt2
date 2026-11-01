import { router } from 'expo-router';
import { Check, ChevronRight } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ErrorState, Icon, NavBar, Text } from '@/components/atoms';
import { ItemIcon } from '@/components/bucket/ItemIcon';
import { BottomBar } from '@/components/bucket/BottomBar';
import { EmptyState } from '@/components/bucket/EmptyState';
import { SpaceAvatar } from '@/components/space/SpaceAvatar';
import {
  getCategory,
  itemTodos,
  newTodoId,
  type BucketItem,
} from '@/lib/bucket/types';
import { noteFailure } from '@/lib/connection';
import { showAlert } from '@/lib/dialog';
import { hapticSelect, hapticSuccess } from '@/lib/haptics';
import { fetchItems, fromRow } from '@/lib/supabase/bucketRemote';
import { cn } from '@/lib/utils';
import { type ImportSource, useImportSources } from '@/hooks/useImportSources';
import { LOCAL_KEY, useBucketStore } from '@/store/useBucketStore';

/** 같은 걸 이미 담아 뒀는지 비교할 때 쓰는 열쇠 */
const sameKey = (it: Pick<BucketItem, 'kind' | 'title'>) =>
  `${it.kind}:${it.title.trim()}`;

/** 다른 공간에서 버킷리스트 가져오기: 공간을 고르고 → 담을 걸 골라 지금 공간에 복사한다 */
export default function ImportScreen() {
  const sources = useImportSources();
  const [source, setSource] = useState<ImportSource | null>(null);

  if (source) {
    return <PickItems source={source} onBack={() => setSource(null)} />;
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar title="다른 공간에서 가져오기" />
      {sources.length === 0 ? (
        <EmptyState
          title="가져올 공간이 없어요"
          description="내가 공간장인 다른 공간에서만 가져올 수 있어요."
        />
      ) : (
        <ScrollView contentContainerClassName="gap-2 px-5 pb-8 pt-2">
          <Text variant="muted" size={13} className="pb-2">
            내가 공간장인 공간에서만 가져올 수 있어요. 원래 공간의 항목은 그대로
            남고, 지금 공간에 복사돼요.
          </Text>
          {sources.map((s) => (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              onPress={() => setSource(s)}
              className="flex-row items-center gap-3 rounded-2xl p-4 bg-accent active:opacity-70"
            >
              <SpaceAvatar emoji={s.emoji} imagePath={s.imagePath} size={40} />
              <Text weight="600" size={15} className="flex-1" numberOfLines={1}>
                {s.name}
              </Text>
              <Icon
                as={ChevronRight}
                size={18}
                className="text-muted-foreground"
              />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; items: BucketItem[] };

/** 고른 공간의 버킷리스트(아직 안 한 것)에서 가져올 걸 고른다 */
function PickItems({
  source,
  onBack,
}: {
  source: ImportSource;
  onBack: () => void;
}) {
  const current = useBucketStore((s) => s.items);
  const addItems = useBucketStore((s) => s.addItems);
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  /** '다시 시도'를 누를 때마다 올려서 다시 불러온다 */
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  // 지금 공간에 이미 같은 게 있으면 또 담지 않게 막는다
  const currentKeys = useMemo(
    () => new Set(current.filter((it) => !it.done).map(sameKey)),
    [current]
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const all =
        source.id === LOCAL_KEY
          ? (useBucketStore.getState().cache[LOCAL_KEY] ?? [])
          : (await fetchItems(source.id)).map((row) => fromRow(row));
      return all.filter((it) => !it.done);
    };
    load()
      .then((items) => {
        if (cancelled) return;
        setState({ status: 'ready', items });
        // 처음엔 아직 없는 것을 다 골라 둔다
        setSelected(
          new Set(
            items
              .filter((it) => !currentKeys.has(sameKey(it)))
              .map((it) => it.id)
          )
        );
      })
      .catch((e: unknown) => {
        noteFailure(e);
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
    // 공간을 고를 때 한 번만 불러온다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.id, attempt]);

  const items = state.status === 'ready' ? state.items : [];
  const selectable = items.filter((it) => !currentKeys.has(sameKey(it)));
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

  const importSelected = () => {
    const picked = items.filter((it) => selected.has(it.id));
    addItems(
      picked.map((it) => ({
        kind: it.kind,
        title: it.title,
        category: it.category,
        setting: it.setting,
        location: it.location,
        place: it.place ?? null,
        memo: it.memo,
        // 할 것도 같이 가져오고, 체크는 풀어서 새로 시작한다
        todos: itemTodos(it).map((t) => ({
          ...t,
          id: newTodoId(),
          done: false,
        })),
      }))
    );
    hapticSuccess();
    router.back();
    showAlert(`${picked.length}개를 가져왔어요`);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar
        title={source.name}
        onBack={onBack}
        right={
          selectable.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() =>
                setSelected(
                  allSelected
                    ? new Set()
                    : new Set(selectable.map((it) => it.id))
                )
              }
            >
              <Text weight="600" size={14} className="text-primary">
                {allSelected ? '선택 해제' : '전체 선택'}
              </Text>
            </Pressable>
          ) : null
        }
      />
      {state.status === 'loading' ? (
        <View className="items-center gap-3 py-10">
          <ActivityIndicator />
          <Text variant="muted">불러오는 중이에요</Text>
        </View>
      ) : state.status === 'error' ? (
        <ErrorState
          title="불러오지 못했어요"
          onRetry={() => {
            setState({ status: 'loading' });
            setAttempt((n) => n + 1);
          }}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="가져올 버킷리스트가 없어요"
          description="이 공간에는 아직 안 한 항목이 없어요."
        />
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(it) => it.id}
            extraData={selected}
            contentContainerClassName="gap-2 px-5 pb-8 pt-1"
            renderItem={({ item }) => {
              const already = currentKeys.has(sameKey(item));
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
                    'flex-row items-center gap-3 rounded-2xl border bg-card p-4',
                    isSelected ? 'border-2 border-primary' : 'border-border',
                    already && 'opacity-50'
                  )}
                >
                  <ItemIcon item={item} size={44} iconSize={20} />
                  <View className="flex-1 gap-0.5">
                    <Text weight="600" size={15} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text variant="muted" size={12} numberOfLines={1}>
                      {already
                        ? '이미 지금 공간에 있어요'
                        : [category.label, item.location]
                            .filter(Boolean)
                            .join(' · ')}
                    </Text>
                  </View>
                  <View
                    className={cn(
                      'h-7 w-7 items-center justify-center rounded-full border-2',
                      isSelected
                        ? 'border-primary bg-primary'
                        : 'border-muted bg-background'
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
                  ? `${selected.size}개 가져오기`
                  : '가져올 걸 골라주세요'
              }
              disabled={selected.size === 0}
              onPress={importSelected}
            />
          </BottomBar>
        </>
      )}
    </SafeAreaView>
  );
}
