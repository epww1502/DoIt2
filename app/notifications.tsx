import dayjs from 'dayjs';
import {
  CalendarHeart,
  CircleCheck,
  Flag,
  Plus,
  Star,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorState, Icon, NavBar, Text } from '@/components/atoms';
import { EmptyState } from '@/components/bucket/EmptyState';
import { openFromNotification } from '@/components/sync/PushSync';
import { useInboxEntries, type InboxEntry } from '@/hooks/useInbox';
import { cn } from '@/lib/utils';
import { useInboxStore } from '@/store/useInboxStore';
import { useLocalInboxStore } from '@/store/useLocalInboxStore';

const KIND_ICON: Record<InboxEntry['kind'], LucideIcon> = {
  added: Plus,
  done: CircleCheck,
  reviewed: Star,
  goal: Flag,
  weekend: CalendarHeart,
};

/** '방금', '5분 전', '3시간 전', '어제', '10월 21일' */
function timeLabel(at: number) {
  const diffMin = Math.floor((Date.now() - at) / 60000);
  if (diffMin < 1) return '방금';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const day = dayjs(at);
  if (dayjs().subtract(1, 'day').isSame(day, 'day')) return '어제';
  return day.isSame(dayjs(), 'year')
    ? day.format('M월 D일')
    : day.format('YYYY년 M월 D일');
}

/**
 * 알림센터: 같은 공간 사람의 소식(담기·기록·평가)과 폰 안 알림(목표 날짜·주말 추천).
 * 들어오면 모두 읽음으로 바꾸고, 이번에 처음 본 것만 점으로 표시해 둔다.
 */
export default function NotificationsScreen() {
  const entries = useInboxEntries();
  const status = useInboxStore((s) => s.status);
  const error = useInboxStore((s) => s.error);
  // 들어온 순간 안 읽었던 것 (읽음 처리 뒤에도 이번엔 표시해 둔다)
  const [freshIds] = useState(
    () => new Set(entries.filter((e) => e.unread).map((e) => e.id))
  );

  useEffect(() => {
    void useInboxStore.getState().markAllRead();
    useLocalInboxStore.getState().markSeen();
    // 다시 받아서 최신으로
    void useInboxStore.getState().load();
  }, []);

  const retry = () => void useInboxStore.getState().load();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar title="알림" />
      {entries.length === 0 ? (
        status === 'loading' || status === 'idle' ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : status === 'error' ? (
          <ErrorState
            error={error}
            title="알림을 불러오지 못했어요"
            onRetry={retry}
          />
        ) : (
          <EmptyState
            title="아직 알림이 없어요"
            description={
              '같은 공간 사람이 담거나 기록하면,\n목표 날짜가 다가오면 여기에 모여요.'
            }
          />
        )
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.id}
          contentContainerClassName="px-5 pb-10 pt-2"
          ItemSeparatorComponent={() => <View className="h-px bg-border" />}
          renderItem={({ item }) => (
            <InboxRow entry={item} fresh={freshIds.has(item.id)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function InboxRow({ entry, fresh }: { entry: InboxEntry; fresh: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        void openFromNotification({
          spaceId: entry.spaceId,
          itemId: entry.itemId,
        })
      }
      className="flex-row gap-3 py-4 active:opacity-70"
    >
      <View
        className={cn(
          'h-10 w-10 items-center justify-center rounded-full',
          fresh ? 'bg-primary' : 'bg-accent'
        )}
      >
        <Icon
          as={KIND_ICON[entry.kind]}
          size={18}
          className={
            fresh ? 'text-primary-foreground' : 'text-muted-foreground'
          }
        />
      </View>
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center justify-between gap-2">
          <Text variant="muted" size={12} numberOfLines={1} className="flex-1">
            {entry.title}
          </Text>
          <Text variant="muted" size={12}>
            {timeLabel(entry.at)}
          </Text>
        </View>
        <Text size={15} weight={fresh ? '600' : '400'}>
          {entry.body}
        </Text>
      </View>
    </Pressable>
  );
}
