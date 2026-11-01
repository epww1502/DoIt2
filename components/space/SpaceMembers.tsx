import { router, useFocusEffect } from 'expo-router';
import { ChevronRight, Ellipsis } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { showAlert } from '@/lib/dialog';
import { ActionSheet, Icon, InlineError, Text } from '@/components/atoms';
import { noteFailure } from '@/lib/connection';
import { showErrorAlert } from '@/lib/errors';
import {
  fetchSpaceMembers,
  kickSpaceMember,
  transferSpaceOwner,
} from '@/lib/supabase/account';
import type { MemberProfile } from '@/lib/supabase/database.types';
import { fetchMyBlocks, unblockUser } from '@/lib/supabase/social';
import { openMemberProfile } from '@/store/useMembersStore';
import { displayName } from '@/store/useProfileStore';
import { useSpaceStore } from '@/store/useSpaceStore';

import { PersonAvatar } from './PersonAvatar';
import { askBlock, askReport } from './spaceFlow';

type SpaceMembersProps = {
  spaceId: string;
  /** 인원이 바뀌면 다시 받아온다 */
  memberCount: number;
};

/**
 * 공간 관리: 누가 들어와 있는지. 이 공간에서 공개를 끈 사람은 '익명', 공간장은 왕관.
 * 다른 멤버의 ⋯ 버튼으로 신고·차단(풀기)을 하고, 공간장은 공간장을 넘겨주거나 내보낼 수도 있다.
 */
export function SpaceMembers({ spaceId, memberCount }: SpaceMembersProps) {
  const [members, setMembers] = useState<MemberProfile[] | null>(null);
  /** 처음 받아오기가 실패했는지 (이미 받은 목록이 있으면 그걸 계속 보여준다) */
  const [loadFailed, setLoadFailed] = useState(false);
  /** 선택지 시트를 연 멤버 */
  const [sheetFor, setSheetFor] = useState<MemberProfile | null>(null);
  /** 내가 차단한 사람들 */
  const [blocked, setBlocked] = useState<string[]>([]);

  /** 멤버 목록을 서버에서 다시 받는다. 돌려주는 함수를 부르면 늦게 온 응답은 버린다 */
  const load = useCallback(() => {
    let cancelled = false;
    Promise.all([fetchSpaceMembers(spaceId), fetchMyBlocks()])
      .then(([list, blocks]) => {
        if (cancelled) return;
        setMembers(list);
        setBlocked(blocks);
        setLoadFailed(false);
      })
      .catch((e: unknown) => {
        noteFailure(e);
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [spaceId]);

  // 화면에 돌아올 때마다 (내 프로필을 바꾸고 온 경우 등)
  useFocusEffect(load);

  // 누가 들어오거나 나가서 인원 수가 바뀌면 (실시간)
  useEffect(() => {
    if (memberCount > 0) return load();
  }, [memberCount, load]);

  if (!members) {
    return loadFailed ? (
      <InlineError
        message="멤버를 불러오지 못했어요"
        onRetry={() => {
          setLoadFailed(false);
          load();
        }}
      />
    ) : (
      <View className="items-center py-4">
        <ActivityIndicator />
      </View>
    );
  }
  const iAmOwner = members.some((m) => m.is_me && m.is_owner);

  /**
   * 넘겨주기·내보내기를 하고 목록·인원 수를 다시 받는다.
   * optimistic: 서버 응답 전에 화면에 먼저 반영할 목록
   */
  const run = async (
    action: () => Promise<void>,
    optimistic?: (list: MemberProfile[]) => MemberProfile[]
  ) => {
    const prev = members;
    if (optimistic) setMembers(optimistic(prev));
    try {
      await action();
      load();
      void useSpaceStore
        .getState()
        .refreshSpaces()
        .catch(() => {});
    } catch (e) {
      setMembers(prev);
      showErrorAlert('하지 못했어요', e);
    }
  };

  const confirmTransfer = (m: MemberProfile) => {
    const name = displayName(m.nickname);
    showAlert(
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
    showAlert(
      `${name}님을 내보낼까요?`,
      '다시 못 들어오게 하려면 초대 코드도 바꿔주세요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '내보내기',
          style: 'destructive',
          onPress: () =>
            void run(
              () => kickSpaceMember(spaceId, m.user_id),
              (list) => list.filter((x) => x.user_id !== m.user_id)
            ),
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
            {/* 누르면 그 사람 프로필 */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${displayName(m.nickname)} 프로필 보기`}
              onPress={() => openMemberProfile(m.user_id, false)}
              className="flex-1 flex-row items-center gap-3 active:opacity-70"
            >
              <PersonAvatar
                imagePath={m.avatar_path}
                size={36}
                crown={m.is_owner}
              />
              <View className="flex-1">
                <Text size={15} numberOfLines={1}>
                  {displayName(m.nickname)}
                </Text>
                {blocked.includes(m.user_id) ? (
                  <Text size={12} className="text-muted-foreground">
                    차단함 · 댓글이 보이지 않아요
                  </Text>
                ) : null}
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${displayName(m.nickname)} 관리`}
              hitSlop={10}
              onPress={() => setSheetFor(m)}
              className="p-1 active:opacity-60"
            >
              <Icon as={Ellipsis} size={20} className="text-muted-foreground" />
            </Pressable>
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
                ...(iAmOwner
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
                  : []),
                {
                  label: '신고하기',
                  onPress: () =>
                    askReport({
                      spaceId,
                      targetUserId: sheetFor.user_id,
                      name: displayName(sheetFor.nickname),
                      onBlocked: load,
                    }),
                },
                blocked.includes(sheetFor.user_id)
                  ? {
                      label: '차단 풀기',
                      onPress: () =>
                        void run(() => unblockUser(sheetFor.user_id)),
                    }
                  : {
                      label: '차단하기',
                      destructive: true,
                      onPress: () =>
                        askBlock(
                          sheetFor.user_id,
                          displayName(sheetFor.nickname),
                          load
                        ),
                    },
              ]
            : []
        }
      />
    </View>
  );
}
