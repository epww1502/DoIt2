import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/atoms';
import { useUnreadCount } from '@/hooks/useInbox';

/** 설정 화면 위 오른쪽 '알림' 버튼: 누르면 알림센터, 안 읽은 게 있으면 옆에 빨간 숫자 */
export function InboxButton() {
  const unread = useUnreadCount();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        unread > 0 ? `알림센터, ${unread}개 안 읽음` : '알림센터'
      }
      hitSlop={8}
      onPress={() => router.push('/notifications')}
      className="h-9 flex-row items-center gap-1.5 rounded-full px-3.5 bg-accent active:opacity-70"
    >
      <Text weight="600" size={14}>
        알림
      </Text>
      {unread > 0 ? (
        <View className="h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 bg-destructive">
          <Text weight="700" size={10} className="text-white">
            {unread > 99 ? '99+' : unread}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
