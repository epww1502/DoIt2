import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon, Text } from '@/components/atoms';
import { useBucketStore } from '@/store/useBucketStore';
import { useSpace, useSpaceStore } from '@/store/useSpaceStore';

import { SpaceAvatar } from './SpaceAvatar';
import { PERSONAL } from './SpaceSwitcher';

/** 설정 탭: 지금 공간 요약. 누르면 공간 관리(또는 새 공간 만들기)로 */
export function SpaceStatusCard() {
  const status = useSpaceStore((s) => s.status);
  const spaceCount = useSpaceStore((s) => s.spaces.length);
  const spaceId = useBucketStore((s) => s.spaceId);
  const space = useSpace(spaceId);

  const detail =
    status === 'unconfigured'
      ? '서버 설정이 없어서 이 휴대폰에만 저장돼요'
      : status === 'loading'
        ? '서버에 연결하는 중이에요'
        : status === 'error'
          ? '서버에 연결하지 못했어요'
          : space
            ? `${space.memberCount}명이 함께 쓰고 있어요 · 초대 코드 ${space.invite_code}`
            : spaceCount > 0
              ? `공간 ${spaceCount}개에 들어가 있어요 · 지금은 나만 보기`
              : '공간을 만들면 친구·연인·가족과 함께 쓸 수 있어요';

  const current = space ?? PERSONAL;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={status !== 'ready'}
      onPress={() => router.push(space ? '/space' : '/space/new')}
      className="flex-row items-center gap-3 rounded-2xl px-4 py-3 bg-accent active:opacity-70"
    >
      <SpaceAvatar
        emoji={current.emoji}
        imagePath={space?.image_path}
        size={36}
      />
      <View className="flex-1 gap-0.5">
        <Text weight="600" size={14}>
          공간 · {current.name}
        </Text>
        <Text size={12} className="text-muted-foreground" numberOfLines={2}>
          {detail}
        </Text>
      </View>
      {status === 'ready' ? (
        <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
      ) : null}
    </Pressable>
  );
}
