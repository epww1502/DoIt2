import { router } from 'expo-router';
import { Bell, ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon, Text } from '@/components/atoms';
import { useUnreadCount } from '@/hooks/useInbox';

/** 설정 맨 위: 알림센터로 가는 칸. 안 읽은 알림이 있으면 테마색 숫자 */
export function InboxCard() {
  const unread = useUnreadCount();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        unread > 0 ? `알림센터, ${unread}개 안 읽음` : '알림센터'
      }
      onPress={() => router.push('/notifications')}
      className="flex-row items-center gap-3 rounded-2xl px-4 py-3 bg-accent active:opacity-70"
    >
      {/* 내 프로필 칸의 사람 아이콘과 같은 모양 (같은 동그라미·색) */}
      <View
        className="items-center justify-center overflow-hidden rounded-full bg-accent"
        style={{ width: 36, height: 36 }}
      >
        <Icon as={Bell} size={18} className="text-muted-foreground" />
      </View>
      <View className="flex-1 gap-0.5">
        <Text weight="600" size={14}>
          알림센터
        </Text>
        <Text size={12} className="text-muted-foreground" numberOfLines={1}>
          {unread > 0
            ? `안 읽은 알림 ${unread}개`
            : '같은 공간 소식, 목표 날짜, 주말 추천'}
        </Text>
      </View>
      {unread > 0 ? (
        <View className="h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5">
          <Text weight="700" size={11} className="text-primary-foreground">
            {unread > 99 ? '99+' : unread}
          </Text>
        </View>
      ) : null}
      <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
    </Pressable>
  );
}
