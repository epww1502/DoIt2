import dayjs from 'dayjs';
import {
  CalendarHeart,
  CircleCheck,
  Flag,
  MessageCircle,
  Plus,
  Star,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorState, Icon, NavBar, Text } from '@/components/atoms';
import { EmptyState } from '@/components/bucket/EmptyState';
import { openFromNotification } from '@/components/sync/PushSync';
import {
  markAllEntriesRead,
  markEntryRead,
  useInboxEntries,
  type InboxEntry,
} from '@/hooks/useInbox';
import { cn } from '@/lib/utils';
import { useInboxStore } from '@/store/useInboxStore';
import { usePrimaryColor } from '@/store/useSettingsStore';

const KIND_ICON: Record<InboxEntry['kind'], LucideIcon> = {
  added: Plus,
  done: CircleCheck,
  reviewed: Star,
  commented: MessageCircle,
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
 * 안 읽은 알림은 배경을 깔아 구분하고, 누르면 그 알림만 읽음. 위 '모두 읽음'으로 한 번에.
 */
export default function NotificationsScreen() {
  const entries = useInboxEntries();
  const status = useInboxStore((s) => s.status);
  const error = useInboxStore((s) => s.error);
  const unreadCount = entries.filter((e) => e.unread).length;

  // 들어오면 최신으로 다시 받는다
  useEffect(() => {
    void useInboxStore.getState().load();
  }, []);

  const retry = () => void useInboxStore.getState().load();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar
        title="알림"
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: unreadCount === 0 }}
            disabled={unreadCount === 0}
            hitSlop={8}
            onPress={markAllEntriesRead}
            className="h-10 justify-center px-2 active:opacity-60"
          >
            <Text
              weight="600"
              size={14}
              className={
                unreadCount > 0 ? 'text-primary' : 'text-muted-foreground'
              }
            >
              모두 읽음
            </Text>
          </Pressable>
        }
      />
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
          contentContainerClassName="pb-10 pt-2"
          ItemSeparatorComponent={() => (
            <View className="mx-5 h-px bg-border" />
          )}
          renderItem={({ item }) => <InboxRow entry={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function InboxRow({ entry }: { entry: InboxEntry }) {
  const primary = usePrimaryColor();
  const unread = entry.unread;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${unread ? '안 읽음, ' : ''}${entry.body}`}
      onPress={() => {
        markEntryRead(entry);
        void openFromNotification({
          spaceId: entry.spaceId,
          itemId: entry.itemId,
        });
      }}
      // 안 읽은 알림은 테마색을 아주 연하게 깔아 구분한다
      style={unread ? { backgroundColor: `${primary}14` } : undefined}
      className="flex-row gap-3 px-5 py-4 active:opacity-70"
    >
      <View
        className={cn(
          'h-10 w-10 items-center justify-center rounded-full',
          unread ? 'bg-primary' : 'bg-accent'
        )}
      >
        <Icon
          as={KIND_ICON[entry.kind]}
          size={18}
          className={
            unread ? 'text-primary-foreground' : 'text-muted-foreground'
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
        <Text size={15} weight={unread ? '600' : '400'}>
          {entry.body}
        </Text>
      </View>
    </Pressable>
  );
}
