import { router, useFocusEffect } from 'expo-router';
import { ChevronRight, Ellipsis } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { ActionSheet, Icon, Text } from '@/components/atoms';
import {
  fetchSpaceMembers,
  kickSpaceMember,
  transferSpaceOwner,
} from '@/lib/supabase/account';
import type { MemberProfile } from '@/lib/supabase/database.types';
import { displayName } from '@/store/useProfileStore';
import { useSpaceStore } from '@/store/useSpaceStore';

import { PersonAvatar } from './PersonAvatar';

type SpaceMembersProps = {
  spaceId: string;
  /** 인원이 바뀌면 다시 받아온다 */
  memberCount: number;
};

/**
 * 공간 관리: 누가 들어와 있는지. 이 공간에서 공개를 끈 사람은 '익명', 공간장은 왕관.
 * 공간장은 다른 멤버의 ⋯ 버튼으로 공간장을 넘겨주거나 내보낼 수 있다.
 */
export function SpaceMembers({ spaceId, memberCount }: SpaceMembersProps) {
  const [members, setMembers] = useState<MemberProfile[] | null>(null);
  /** 넘겨주기·내보내기 뒤에 다시 받으려고 올린다 */
  const [version, setVersion] = useState(0);
  /** 선택지 시트를 연 멤버 */
  const [sheetFor, setSheetFor] = useState<MemberProfile | null>(null);

  // 화면에 돌아올 때마다(내 프로필을 바꾸고 온 경우 등), 인원이 바뀔 때마다 다시 받는다
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      // 인원·version이 바뀌면 다시 받으려고 의존성에 넣는다 (값 자체는 안 쓴다)
      void memberCount;
      void version;
      fetchSpaceMembers(spaceId)
        .then((list) => {
          if (!cancelled) setMembers(list);
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }, [spaceId, memberCount, version])
  );

  if (!members) return null;
  const iAmOwner = members.some((m) => m.is_me && m.is_owner);

  const afterChange = () => {
    setVersion((v) => v + 1);
    void useSpaceStore
      .getState()
      .refreshSpaces()
      .catch(() => {});
  };

  const run = async (action: () => Promise<void>) => {
    try {
      await action();
      afterChange();
    } catch (e) {
      Alert.alert(e instanceof Error ? e.message : '하지 못했어요');
    }
  };

  const confirmTransfer = (m: MemberProfile) => {
    const name = displayName(m.nickname);
    Alert.alert(
      `${name}님에게 공간장을 넘길까요?`,
      '넘기면 나는 일반 멤버가 돼요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '넘겨주기',
          onPress: () => void run(() => transferSpaceOwner(spaceId, m.user_id)),
        },
      ]
    );
  };

  const confirmKick = (m: MemberProfile) => {
    const name = displayName(m.nickname);
    Alert.alert(
      `${name}님을 내보낼까요?`,
      '다시 못 들어오게 하려면 초대 코드도 바꿔주세요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '내보내기',
          style: 'destructive',
          onPress: () => void run(() => kickSpaceMember(spaceId, m.user_id)),
        },
      ]
    );
  };

  return (
    <View className="gap-3">
      {members.map((m) => {
        if (m.is_me) {
          return (
            <Pressable
              key={m.user_id}
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: '/space/profile',
                  params: { id: spaceId },
                })
              }
              className="flex-row items-center gap-3 active:opacity-70"
            >
              <PersonAvatar
                imagePath={m.avatar_path}
                size={36}
                crown={m.is_owner}
              />
              <View className="flex-1">
                <Text size={15} weight="600" numberOfLines={1}>
                  {displayName(m.nickname)}
                </Text>
                <Text size={12} className="text-muted-foreground">
                  {m.show_profile
                    ? '나 · 이 공간 프로필 바꾸기'
                    : "나 · 다른 사람에겐 '익명'으로 보여요"}
                </Text>
              </View>
              <Icon
                as={ChevronRight}
                size={18}
                className="text-muted-foreground"
              />
            </Pressable>
          );
        }
        return (
          <View key={m.user_id} className="flex-row items-center gap-3">
            <PersonAvatar
              imagePath={m.avatar_path}
              size={36}
              crown={m.is_owner}
            />
            <Text size={15} numberOfLines={1} className="flex-1">
              {displayName(m.nickname)}
            </Text>
            {iAmOwner ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${displayName(m.nickname)} 관리`}
                hitSlop={10}
                onPress={() => setSheetFor(m)}
                className="p-1 active:opacity-60"
              >
                <Icon
                  as={Ellipsis}
                  size={20}
                  className="text-muted-foreground"
                />
              </Pressable>
            ) : null}
          </View>
        );
      })}
      <ActionSheet
        visible={sheetFor !== null}
        onClose={() => setSheetFor(null)}
        header={
          sheetFor ? (
            <View className="flex-row items-center gap-3">
              <PersonAvatar imagePath={sheetFor.avatar_path} size={44} />
              <Text weight="700" size={17} numberOfLines={1} className="flex-1">
                {displayName(sheetFor.nickname)}
              </Text>
            </View>
          ) : null
        }
        items={
          sheetFor
            ? [
                {
                  label: '공간장 넘겨주기',
                  onPress: () => confirmTransfer(sheetFor),
                },
                {
                  label: '내보내기',
                  destructive: true,
                  onPress: () => confirmKick(sheetFor),
                },
              ]
            : []
        }
      />
    </View>
  );
}
