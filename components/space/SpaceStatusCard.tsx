import { router } from 'expo-router';
import { ChevronRight, RefreshCw } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon, Text } from '@/components/atoms';
import { useBucketStore } from '@/store/useBucketStore';
import { useSpace, useSpaceStore } from '@/store/useSpaceStore';

import { SpaceAvatar } from './SpaceAvatar';
import { PERSONAL } from './SpaceSwitcher';

/**
 * 설정 탭: 지금 공간 요약. 누르면 그 공간의 관리 화면(초대·멤버·이름)으로 간다.
 * 내 공간 전체(순서 바꾸기·나가기·새로 만들기)는 아래의 '전체 보기' 줄로 따로 간다.
 * 카드가 한 공간을 보여 주는데 전체 목록이 열리면 어긋나 보여서 나눴다.
 * 지금 '나만 보기'면 볼 공간이 없으니 카드가 전체 목록(공간이 없으면 새 공간 만들기)으로 간다.
 */
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
          ? '서버에 연결하지 못했어요 · 눌러서 다시 시도해요'
          : space
            ? space.is_personal
              ? '개인 공간 · 나만 볼 수 있어요'
              : `${space.memberCount}명이 함께 쓰고 있어요 · 초대 코드 ${space.invite_code}`
            : spaceCount > 0
              ? `공간 ${spaceCount}개에 들어가 있어요 · 지금은 나만 보기`
              : '공간을 만들면 친구·연인·가족과 함께 쓸 수 있어요';

  const current = space ?? PERSONAL;

  const card = (
    <Pressable
      accessibilityRole="button"
      // 연결에 실패했으면 눌러서 다시 연결한다
      disabled={status !== 'ready' && status !== 'error'}
      onPress={() => {
        if (status === 'error') {
          void useSpaceStore.getState().init();
          return;
        }
        if (space) {
          router.push({ pathname: '/space', params: { id: space.id } });
          return;
        }
        router.push(spaceCount > 0 ? '/space/list' : '/space/new');
      }}
      className="flex-row items-center gap-3 rounded-2xl px-4 py-3 bg-accent active:opacity-70"
    >
      <SpaceAvatar
        emoji={current.emoji}
        imagePath={space?.image_path}
        size={36}
      />
      <View className="flex-1 gap-0.5">
        <Text weight="600" size={14}>
          {current.name}
        </Text>
        <Text size={12} className="text-muted-foreground" numberOfLines={2}>
          {detail}
        </Text>
      </View>
      {status === 'ready' ? (
        <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
      ) : status === 'error' ? (
        <Icon as={RefreshCw} size={18} className="text-primary" />
      ) : null}
    </Pressable>
  );

  // 지금 공간을 보고 있을 때만 전체 보기 줄을 따로 둔다 (아니면 카드가 이미 전체 목록으로 간다)
  if (status !== 'ready' || !space) return card;
  return (
    <View className="gap-2">
      {card}
      <Pressable
        accessibilityRole="button"
        hitSlop={6}
        onPress={() => router.push('/space/list')}
        className="flex-row items-center justify-between px-4 py-1 active:opacity-60"
      >
        <Text size={13} className="text-muted-foreground">
          {`내 공간 ${spaceCount}개`}
        </Text>
        <View className="flex-row items-center gap-0.5">
          <Text weight="600" size={13} className="text-primary">
            전체 보기
          </Text>
          <Icon as={ChevronRight} size={16} className="text-primary" />
        </View>
      </Pressable>
    </View>
  );
}
