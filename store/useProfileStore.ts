import { create } from 'zustand';

import { deletePhoto } from '@/lib/bucket/photo';
import { fetchMyProfile, saveMyProfile } from '@/lib/supabase/account';
import type { ProfileRow } from '@/lib/supabase/database.types';

import { useSpaceStore } from './useSpaceStore';

type ProfileState = {
  /** 내 프로필. 아직 안 만들었으면 null */
  profile: ProfileRow | null;
  load: () => Promise<void>;
  /** 실패하면 사용자에게 보여줄 문구를 담은 Error를 던진다 */
  save: (patch: {
    nickname: string | null;
    avatarUri?: string | null;
  }) => Promise<void>;
};

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,

  load: async () => {
    const userId = useSpaceStore.getState().userId;
    if (!userId) return set({ profile: null });
    set({ profile: await fetchMyProfile(userId) });
  },

  save: async (patch) => {
    const userId = useSpaceStore.getState().userId;
    if (!userId) throw new Error('서버에 연결된 뒤에 저장할 수 있어요.');
    try {
      set({ profile: await saveMyProfile(userId, get().profile, patch) });
    } catch {
      throw new Error('저장하지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      // 올렸든 못 올렸든 휴대폰에 복사해 둔 사진은 필요 없다
      if (patch.avatarUri) deletePhoto(patch.avatarUri);
    }
  },
}));

/** 화면에 보여줄 이름: 닉네임이 없거나 그 공간에서 공개를 끈 사람은 '익명' */
export function displayName(nickname: string | null | undefined) {
  return nickname?.trim() || '익명';
}
