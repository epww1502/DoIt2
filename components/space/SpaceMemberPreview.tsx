import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/atoms';
import type { MemberProfile } from '@/lib/supabase/database.types';
import { useMembersStore } from '@/store/useMembersStore';
import { displayName } from '@/store/useProfileStore';

import { PersonAvatar } from './PersonAvatar';

/** 미리보기 줄에 얼굴·이름을 몇 명까지 보여줄지 */
const PREVIEW_COUNT = 3;

/** 이 공간 멤버 (다른 사람 먼저, 공간장 먼저, 나는 맨 뒤). 받는 중이면 null */
function useSpaceMemberList(
  spaceId: string,
  memberCount: number
): MemberProfile[] | null {
  const entry = useMembersStore((s) => s.bySpace[spaceId]);
  useEffect(() => {
    if (entry && entry.count === memberCount) return;
    void useMembersStore.getState().load(spaceId, memberCount);
  }, [spaceId, memberCount, entry]);
  if (!entry) return null;
  return [...entry.members].sort(
    (a, b) =>
      Number(a.is_me) - Number(b.is_me) ||
      Number(b.is_owner) - Number(a.is_owner)
  );
}

const nameOf = (m: MemberProfile) => (m.is_me ? '나' : displayName(m.nickname));

/** '지수, 민호, 나' 또는 '지수, 민호, 서연 외 2명' */
export function memberNamesLabel(names: string[], max = PREVIEW_COUNT) {
  if (names.length <= max) return names.join(', ');
  return `${names.slice(0, max).join(', ')} 외 ${names.length - max}명`;
}

/**
 * 공간 목록 한 줄 아래: 멤버 얼굴 겹쳐서 + 이름 몇 개 (인스타그램 '좋아요'처럼).
 * 누르면 onPress (멤버 전체 목록 열기)
 */
export function SpaceMemberPreview({
  spaceId,
  memberCount,
  onPress,
}: {
  spaceId: string;
  memberCount: number;
  onPress: () => void;
}) {
  const members = useSpaceMemberList(spaceId, memberCount);
  if (!members || members.length === 0) {
    return (
      <Text variant="muted" size={12}>
        {`${memberCount}명`}
      </Text>
    );
  }
  const names = members.map(nameOf);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`멤버 ${members.length}명: ${names.join(', ')}. 눌러서 목록 보기`}
      hitSlop={6}
      onPress={onPress}
      className="flex-row items-center gap-1.5 self-start active:opacity-60"
    >
      <View className="flex-row">
        {members.slice(0, PREVIEW_COUNT).map((m, i) => (
          <View
            key={m.user_id}
            className="rounded-full border-2 border-background"
            style={{ marginLeft: i === 0 ? 0 : -8 }}
          >
            <PersonAvatar imagePath={m.avatar_path} size={20} />
          </View>
        ))}
      </View>
      <Text
        size={12}
        className="shrink text-muted-foreground"
        numberOfLines={1}
      >
        {memberNamesLabel(names)}
      </Text>
    </Pressable>
  );
}

/** 공간 멤버 전체 목록 (얼굴·이름, 공간장은 왕관, 나는 '나') */
export function SpaceMemberList({
  spaceId,
  memberCount,
}: {
  spaceId: string;
  memberCount: number;
}) {
  const members = useSpaceMemberList(spaceId, memberCount);
  if (!members) {
    return (
      <View className="items-center py-6">
        <ActivityIndicator />
      </View>
    );
  }
  return (
    <ScrollView contentContainerClassName="gap-3 px-5 pb-2">
      {members.map((m) => (
        <View key={m.user_id} className="flex-row items-center gap-3">
          <PersonAvatar
            imagePath={m.avatar_path}
            size={40}
            crown={m.is_owner}
          />
          <View className="flex-1 gap-0.5">
            <Text weight={m.is_me ? '600' : '400'} size={15} numberOfLines={1}>
              {displayName(m.nickname)}
            </Text>
            {m.is_me || m.is_owner ? (
              <Text size={12} className="text-muted-foreground">
                {[m.is_me ? '나' : '', m.is_owner ? '공간장' : '']
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
