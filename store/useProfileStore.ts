import { create } from 'zustand';

import { deletePhoto } from '@/lib/bucket/photo';
import { noteFailure } from '@/lib/connection';
import { fetchMyProfile, saveMyProfile } from '@/lib/supabase/account';
import type { ProfileRow } from '@/lib/supabase/database.types';

import { useSpaceStore } from './useSpaceStore';

export type ProfileLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

type ProfileState = {
  /** 내 프로필. 아직 안 만들었으면 null */
  profile: ProfileRow | null;
  /**
   * 서버에서 불러왔는지. 'ready'가 아니면 profile이 null이어도 "없음"이 아니라 "모름"이다.
   * (모르는 채로 저장하면 서버의 닉네임·사진을 덮어쓰므로 저장을 막는다)
   */
  loadStatus: ProfileLoadStatus;
  loadError: unknown;
  /** 실패하면 던진다 (loadStatus는 'error') */
  load: () => Promise<void>;
  /** 실패하면 사용자에게 보여줄 문구를 담은 Error를 던진다 */
  save: (patch: {
    nickname: string | null;
    avatarUri?: string | null;
  }) => Promise<void>;
};

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  loadStatus: 'idle',
  loadError: null,

  load: async () => {
    const userId = useSpaceStore.getState().userId;
    if (!userId) return set({ profile: null, loadStatus: 'idle' });
    set({ loadStatus: 'loading', loadError: null });
    try {
      set({ profile: await fetchMyProfile(userId), loadStatus: 'ready' });
    } catch (e) {
      noteFailure(e);
      set({ loadStatus: 'error', loadError: e });
      throw e;
    }
  },

  save: async (patch) => {
    const userId = useSpaceStore.getState().userId;
    if (!userId) throw new Error('서버에 연결된 뒤에 저장할 수 있어요.');
    if (get().loadStatus !== 'ready') {
      throw new Error(
        '프로필을 아직 불러오지 못했어요. 다시 불러온 뒤 저장해주세요.'
      );
    }
    try {
      set({ profile: await saveMyProfile(userId, get().profile, patch) });
    } catch (e) {
      noteFailure(e);
      // 고른 사진은 지우지 않는다 (다시 시도할 때 그대로 올린다)
      throw new Error('저장하지 못했어요. 잠시 후 다시 시도해주세요.');
    }
    // 서버에 올렸으니 휴대폰에 복사해 둔 사진은 필요 없다
    if (patch.avatarUri) deletePhoto(patch.avatarUri);
  },
}));

/** 화면에 보여줄 이름: 닉네임이 없거나 그 공간에서 공개를 끈 사람은 '익명' */
export function displayName(nickname: string | null | undefined) {
  return nickname?.trim() || '익명';
}
