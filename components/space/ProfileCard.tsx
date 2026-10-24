import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon, Text } from '@/components/atoms';
import { useProfileStore } from '@/store/useProfileStore';
import { useSpaceStore } from '@/store/useSpaceStore';

import { PersonAvatar } from './PersonAvatar';

/** 설정 탭: 내 프로필 요약. 누르면 프로필·계정 코드 화면으로 */
export function ProfileCard() {
  const status = useSpaceStore((s) => s.status);
  const profile = useProfileStore((s) => s.profile);
  // 서버가 없으면 프로필도 쓸 수 없다
  if (status === 'unconfigured') return null;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={status !== 'ready'}
      onPress={() => router.push('/profile')}
      className="flex-row items-center gap-3 rounded-2xl px-4 py-3 bg-accent active:opacity-70"
    >
      <PersonAvatar imagePath={profile?.avatar_path} size={36} />
      <View className="flex-1 gap-0.5">
        <Text weight="600" size={14} numberOfLines={1}>
          {profile?.nickname || '내 프로필'}
        </Text>
        <Text size={12} className="text-muted-foreground">
          {profile?.nickname
            ? '닉네임·사진, 계정 코드'
            : '닉네임·사진을 정하고 계정 코드를 만들 수 있어요'}
        </Text>
      </View>
      {status === 'ready' ? (
        <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
      ) : null}
    </Pressable>
  );
}
