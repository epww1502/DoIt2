import { X } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon, Text } from '@/components/atoms';
import { shareInvite } from '@/lib/shareInvite';
import { useSettingsStore } from '@/store/useSettingsStore';
import type { Space } from '@/store/useSpaceStore';

/**
 * 버킷리스트 위의 '같이 쓸 사람 초대하기' 안내.
 * 함께 쓰는 공간에 아직 나만 있을 때 보인다. 누가 들어오거나 닫으면 사라진다.
 */
export function InviteCard({ space }: { space: Space }) {
  const hidden = useSettingsStore((s) => s.inviteCardHidden.includes(space.id));
  if (space.is_personal || space.memberCount > 1 || hidden) return null;

  return (
    <View className="mx-5 mb-4 flex-row items-center gap-3 rounded-2xl border border-primary/30 px-4 py-3 bg-accent">
      <View className="flex-1 gap-0.5">
        <Text weight="600" size={14}>
          같이 쓸 사람을 초대해요
        </Text>
        <Text size={12} className="text-muted-foreground">
          링크를 보내면 눌러서 바로 들어와요
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => void shareInvite(space, 'home')}
        className="rounded-full bg-primary px-3 py-1.5 active:opacity-70"
      >
        <Text weight="600" size={13} className="text-primary-foreground">
          초대하기
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="초대 안내 닫기"
        hitSlop={8}
        onPress={() => useSettingsStore.getState().hideInviteCard(space.id)}
        className="active:opacity-60"
      >
        <Icon as={X} size={18} className="text-muted-foreground" />
      </Pressable>
    </View>
  );
}
