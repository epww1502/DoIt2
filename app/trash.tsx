import { useFocusEffect } from 'expo-router';
import { RotateCcw } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ErrorState, Icon, NavBar, Text } from '@/components/atoms';
import { EmptyState } from '@/components/bucket/EmptyState';
import { ItemIcon } from '@/components/bucket/ItemIcon';
import { showAlert } from '@/lib/dialog';
import { showErrorAlert } from '@/lib/errors';
import { hapticSuccess } from '@/lib/haptics';
import {
  expiresLabel,
  fetchTrash,
  removeForever,
  restoreTrashed,
  TRASH_HOURS,
  type TrashEntry,
} from '@/lib/trash';
import { useBucketStore } from '@/store/useBucketStore';
import { useMemberLookup } from '@/store/useMembersStore';

/** 휴지통: 지운 버킷리스트를 48시간 동안 되살릴 수 있다 (같은 공간 사람 모두) */
export default function TrashScreen() {
  const spaceId = useBucketStore((s) => s.spaceId);
  const pull = useBucketStore((s) => s.pull);
  const member = useMemberLookup(spaceId);
  const [entries, setEntries] = useState<TrashEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // 되살리거나 지우는 중인 항목
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!spaceId) {
      setEntries([]);
      return;
    }
    try {
      setEntries(await fetchTrash(spaceId));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [spaceId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const restore = async (entry: TrashEntry) => {
    setBusy(entry.id);
    try {
      await restoreTrashed(entry.id);
      hapticSuccess();
      setEntries((prev) => prev?.filter((e) => e.id !== entry.id) ?? prev);
      // 실시간으로도 들어오지만, 평가·댓글 수까지 바로 맞추려고 한 번 더 받는다
      void pull().catch(() => {});
      showAlert(
        `'${entry.title}'을(를) 되살렸어요`,
        '버킷리스트에 다시 있어요.'
      );
    } catch (e) {
      const expired = String((e as { message?: string })?.message).includes(
        'trash_expired'
      );
      if (expired) {
        showAlert('되살릴 수 있는 시간이 지났어요');
        void load();
      } else {
        showErrorAlert('되살리지 못했어요', e, () => restore(entry));
      }
    } finally {
      setBusy(null);
    }
  };

  const confirmRemove = (list: TrashEntry[]) =>
    showAlert(
      list.length === 1
        ? `'${list[0].title}'을(를) 영영 지울까요?`
        : `${list.length}개를 영영 지울까요?`,
      '기록과 사진도 같이 지워지고, 다시 되살릴 수 없어요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '영영 지우기',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeForever(list);
              const ids = new Set(list.map((e) => e.id));
              setEntries((prev) => prev?.filter((e) => !ids.has(e.id)) ?? prev);
            } catch (e) {
              showErrorAlert('지우지 못했어요', e);
            }
          },
        },
      ]
    );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar title="휴지통" />
      {entries === null ? (
        failed ? (
          <ErrorState onRetry={() => void load()} />
        ) : (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        )
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} />
          }
          contentContainerClassName="gap-2 px-5 pb-10 pt-2"
          contentContainerStyle={
            entries.length === 0 ? { flexGrow: 1 } : undefined
          }
          ListHeaderComponent={
            entries.length > 0 ? (
              <Text variant="muted" size={12} className="mb-2">
                {`지운 버킷리스트는 ${TRASH_HOURS}시간 동안 여기 있어요. 같은 공간 사람 누구나 되살릴 수 있어요`}
              </Text>
            ) : undefined
          }
          ListEmptyComponent={
            <EmptyState
              emoji="🗑️"
              title="휴지통이 비어 있어요"
              description={`버킷리스트를 지우면 ${TRASH_HOURS}시간 동안 여기서 되살릴 수 있어요`}
            />
          }
          ListFooterComponent={
            entries.length > 1 ? (
              <Button
                label="휴지통 비우기"
                variant="ghost"
                size="md"
                className="mt-4"
                onPress={() => confirmRemove(entries)}
              />
            ) : undefined
          }
          renderItem={({ item: entry }) => {
            const who = entry.deletedBy ? member(entry.deletedBy) : null;
            return (
              <View className="flex-row items-center gap-3 rounded-2xl p-3 bg-accent">
                {entry.item ? (
                  <ItemIcon item={entry.item} size={44} iconSize={20} />
                ) : null}
                <View className="flex-1 gap-0.5">
                  <Text weight="600" size={15} numberOfLines={1}>
                    {entry.title}
                  </Text>
                  <Text variant="muted" size={12} numberOfLines={1}>
                    {`${who ? `${who.isMe ? '내가' : `${who.name}님이`} 지움 · ` : ''}${expiresLabel(entry.expiresAt)}`}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${entry.title} 영영 지우기`}
                  hitSlop={6}
                  disabled={busy !== null}
                  onPress={() => confirmRemove([entry])}
                  className="px-1.5 py-2 active:opacity-60"
                >
                  <Text
                    weight="600"
                    size={13}
                    className="text-muted-foreground"
                  >
                    지우기
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${entry.title} 되살리기`}
                  disabled={busy !== null}
                  onPress={() => void restore(entry)}
                  className="h-9 flex-row items-center gap-1 rounded-full bg-primary px-3 active:opacity-70"
                >
                  {busy === entry.id ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Icon
                      as={RotateCcw}
                      size={14}
                      className="text-primary-foreground"
                    />
                  )}
                  <Text
                    weight="600"
                    size={13}
                    className="text-primary-foreground"
                  >
                    되살리기
                  </Text>
                </Pressable>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
