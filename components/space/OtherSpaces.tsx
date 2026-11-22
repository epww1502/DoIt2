import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon, Text } from '@/components/atoms';
import { useSpaceStore } from '@/store/useSpaceStore';

import { SpaceAvatar } from './SpaceAvatar';

/**
 * 공간 관리 화면 아래: 내가 들어가 있는 다른 공간들. 누르면 그 공간의 관리로 바뀌고,
 * '전체 보기'는 내 공간 전체(순서 바꾸기·나가기·새로 만들기)로 간다.
 * 설정에서 한 공간의 관리로 바로 들어오면 다른 공간으로 갈 길이 없어서 둔다. 다른 공간이 없으면 안 보인다.
 */
export function OtherSpaces({ currentId }: { currentId: string }) {
  const spaces = useSpaceStore((s) => s.spaces);
  const others = spaces.filter((s) => s.id !== currentId);
  if (others.length === 0) return null;

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text weight="600" size={14}>
          {`다른 공간 ${others.length}개`}
        </Text>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          // 전체 목록에서 들어왔으면 그 화면으로 돌아가고, 아니면 이 화면을 목록으로 바꾼다
          onPress={() => router.dismissTo('/space/list')}
          className="flex-row items-center gap-0.5 active:opacity-60"
        >
          <Text weight="600" size={13} className="text-primary">
            전체 보기
          </Text>
          <Icon as={ChevronRight} size={16} className="text-primary" />
        </Pressable>
      </View>
      {others.map((space) => (
        <Pressable
          key={space.id}
          accessibilityRole="button"
          accessibilityLabel={`${space.name} 관리`}
          onPress={() => router.setParams({ id: space.id })}
          className="min-h-[60px] flex-row items-center gap-3 rounded-2xl px-4 py-3 bg-accent active:opacity-70"
        >
          <SpaceAvatar
            emoji={space.emoji}
            imagePath={space.image_path}
            size={36}
          />
          <View className="flex-1 gap-0.5">
            <Text weight="600" size={15} numberOfLines={1}>
              {space.name}
            </Text>
            <Text size={12} className="text-muted-foreground">
              {space.is_personal ? '개인 공간' : `${space.memberCount}명`}
            </Text>
          </View>
          <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
        </Pressable>
      ))}
    </View>
  );
}
