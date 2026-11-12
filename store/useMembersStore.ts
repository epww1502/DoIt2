/**
 * 공간 멤버 이름·사진 모음 (평가 옆에 누가 남겼는지 보여줄 때 쓴다).
 * 공간마다 한 번 받아 두고, 인원이 바뀌거나 화면에 다시 들어오면 새로 받는다.
 */
import { router } from 'expo-router';
import { useEffect } from 'react';
import { create } from 'zustand';

import { noteFailure } from '@/lib/connection';
import { fetchSpaceMembers } from '@/lib/supabase/account';
import type { MemberProfile } from '@/lib/supabase/database.types';
import { displayName } from '@/store/useProfileStore';
import { useSpace } from '@/store/useSpaceStore';

export type MemberInfo = {
  /** 보여줄 이름. 나는 '나' */
  name: string;
  /** 공간에서 쓰는 닉네임 (나도 닉네임으로). 댓글처럼 나를 닉네임과 같이 보여줄 때 */
  nickname: string;
  avatarPath: string | null;
  isMe: boolean;
};

type MembersState = {
  bySpace: Record<string, { members: MemberProfile[]; count: number }>;
  load: (spaceId: string, count: number) => Promise<void>;
};

const loading = new Set<string>();

export const useMembersStore = create<MembersState>((set, get) => ({
  bySpace: {},
  load: async (spaceId, count) => {
    if (loading.has(spaceId)) return;
    loading.add(spaceId);
    try {
      const members = await fetchSpaceMembers(spaceId);
      set({ bySpace: { ...get().bySpace, [spaceId]: { members, count } } });
    } catch (e) {
      noteFailure(e);
    } finally {
      loading.delete(spaceId);
    }
  },
}));

/**
 * 공간 멤버 한 명의 프로필 (공간장·들어온 날 포함).
 * 받는 중이면 undefined, 받았는데 없으면(나간 사람) null
 */
export function useMemberProfile(
  spaceId: string | null,
  userId: string | undefined
): MemberProfile | null | undefined {
  const space = useSpace(spaceId);
  const entry = useMembersStore((s) =>
    spaceId ? s.bySpace[spaceId] : undefined
  );
  const count = space?.memberCount ?? 0;

  useEffect(() => {
    if (!spaceId || !count) return;
    if (entry && entry.count === count) return;
    void useMembersStore.getState().load(spaceId, count);
  }, [spaceId, count, entry]);

  if (!entry) return undefined;
  return entry.members.find((m) => m.user_id === userId) ?? null;
}

/** 다른 사람 프로필을 연다. 나면 '이 공간에서의 내 프로필' 고치기로 */
export function openMemberProfile(userId: string, isMe: boolean) {
  if (isMe) {
    router.push('/space/profile');
    return;
  }
  router.push({ pathname: '/space/member', params: { userId } });
}

const LEFT: MemberInfo = {
  name: '나간 멤버',
  nickname: '나간 멤버',
  avatarPath: null,
  isMe: false,
};

/**
 * 공간 멤버를 user id로 찾는 함수. 아직 못 받았거나 나간 사람이면 '나간 멤버' 대신
 * 받는 중에는 '멤버'로 보여준다.
 */
export function useMemberLookup(spaceId: string | null) {
  const space = useSpace(spaceId);
  const entry = useMembersStore((s) =>
    spaceId ? s.bySpace[spaceId] : undefined
  );
  const count = space?.memberCount ?? 0;

  useEffect(() => {
    if (!spaceId || !count) return;
    if (entry && entry.count === count) return;
    void useMembersStore.getState().load(spaceId, count);
  }, [spaceId, count, entry]);

  return (userId: string): MemberInfo => {
    const m = entry?.members.find((x) => x.user_id === userId);
    if (!m) {
      return entry
        ? LEFT
        : { name: '멤버', nickname: '멤버', avatarPath: null, isMe: false };
    }
    return {
      name: m.is_me ? '나' : displayName(m.nickname),
      nickname: displayName(m.nickname),
      avatarPath: m.avatar_path,
      isMe: m.is_me,
    };
  };
}
