import { create } from 'zustand';

import { deletePhoto } from '@/lib/bucket/photo';
import { deleteMyAccount, signInWithAccountCode } from '@/lib/supabase/account';
import { noteFailure } from '@/lib/connection';
import { removePhoto, uploadPhoto } from '@/lib/supabase/bucketRemote';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import type { SpaceRow } from '@/lib/supabase/database.types';

export type SpaceStatus =
  /** .env에 Supabase 값이 없다 → 휴대폰에만 저장 */
  | 'unconfigured'
  | 'loading'
  | 'ready'
  /** 로그인하지 못했다 (익명 로그인이 꺼져 있거나 인터넷 문제) */
  | 'error';

export type Space = SpaceRow & { memberCount: number };

/** 한 공간에 들어갈 수 있는 최대 인원 (서버 join_space와 같게) */
export const MAX_SPACE_MEMBERS = 10;

type SpaceState = {
  status: SpaceStatus;
  userId: string | null;
  /** 내가 들어가 있는 공간들 (내가 정한 순서, 없으면 먼저 만든 순) */
  spaces: Space[];

  init: () => Promise<void>;
  /** 계정 코드로 다른 폰에서 쓰던 계정을 불러온다. 실패하면 보여줄 문구를 담은 Error */
  restoreAccount: (code: string) => Promise<void>;
  /** 계정을 지우고 새 익명 계정으로 다시 시작한다. 실패하면 보여줄 문구를 담은 Error */
  deleteAccount: () => Promise<void>;
  refreshSpaces: () => Promise<void>;
  /** 실패하면 사용자에게 보여줄 문구를 담은 Error를 던진다 */
  /** personal: 나만 쓰는 개인 공간 (초대할 수 없다) */
  createSpace: (
    name: string,
    emoji: string,
    personal?: boolean
  ) => Promise<SpaceRow>;
  /** 개인 공간 ↔ 함께 쓰는 공간 (공간장만) */
  setPersonal: (spaceId: string, personal: boolean) => Promise<void>;
  joinSpace: (code: string) => Promise<SpaceRow>;
  leaveSpace: (spaceId: string) => Promise<void>;
  /** 공간 노출 순서 바꾸기 (화면은 바로 바뀌고, 서버 저장이 실패하면 되돌린다) */
  reorderSpaces: (orderedIds: string[]) => Promise<void>;
  /** 이름·이모지·사진 바꾸기. imageUri: 새 사진(휴대폰 파일), null: 사진 빼기, undefined: 그대로 */
  updateSpace: (
    spaceId: string,
    patch: { name?: string; emoji?: string; imageUri?: string | null }
  ) => Promise<void>;
};

const RPC_ERRORS: Record<string, string> = {
  invalid_code: '초대 코드가 맞지 않아요. 다시 확인해주세요.',
  space_full: `이미 ${MAX_SPACE_MEMBERS}명이 꽉 찬 공간이에요.`,
  too_many_spaces: '공간은 20개까지 들어갈 수 있어요.',
  personal_space: '개인 공간이라 들어갈 수 없어요.',
  has_members: '다른 멤버가 있어서 개인 공간으로 바꿀 수 없어요.',
  not_owner: '공간장만 바꿀 수 있어요.',
};

function friendlyError(message: string, fallback: string) {
  const key = Object.keys(RPC_ERRORS).find((k) => message.includes(k));
  return new Error(key ? RPC_ERRORS[key] : fallback);
}

export const useSpaceStore = create<SpaceState>((set, get) => ({
  status: isSupabaseConfigured ? 'loading' : 'unconfigured',
  userId: null,
  spaces: [],

  init: async () => {
    if (!isSupabaseConfigured) return;
    set({ status: 'loading' });
    try {
      const { data } = await supabase.auth.getSession();
      let userId = data.session?.user.id ?? null;
      if (!userId) {
        // 이메일·비밀번호 없이 시작한다 (나중에 카카오·Apple 로그인을 이어 붙일 수 있다)
        const { data: signIn, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
        userId = signIn.user?.id ?? null;
      }
      set({ userId });
      await get().refreshSpaces();
      set({ status: 'ready' });
    } catch (e) {
      console.warn('[space] init failed', e);
      noteFailure(e);
      set({ status: 'error' });
    }
  },

  restoreAccount: async (code) => {
    const userId = await signInWithAccountCode(code);
    set({ userId, spaces: [] });
    await get()
      .refreshSpaces()
      .catch(() => {});
    set({ status: 'ready' });
  },

  deleteAccount: async () => {
    await deleteMyAccount();
    set({ userId: null, spaces: [] });
    // 새 익명 계정으로 다시 로그인
    await get().init();
  },

  refreshSpaces: async () => {
    // RLS 때문에 내가 들어가 있는 공간만 보인다
    const [{ data: spaces, error }, { data: members, error: memberError }] =
      await Promise.all([
        supabase
          .from('spaces')
          .select('*')
          .order('created_at', { ascending: true }),
        supabase.from('space_members').select('space_id, user_id, sort_order'),
      ]);
    if (error) throw error;
    if (memberError) throw memberError;

    const counts = new Map<string, number>();
    for (const m of members) {
      counts.set(m.space_id, (counts.get(m.space_id) ?? 0) + 1);
    }
    // 내가 정한 순서대로 (정하지 않은 공간은 뒤에, 먼저 만든 순)
    const userId = get().userId;
    const order = new Map<string, number>();
    for (const m of members) {
      if (m.user_id === userId && m.sort_order != null) {
        order.set(m.space_id, m.sort_order);
      }
    }
    const rank = (id: string) => order.get(id) ?? Number.MAX_SAFE_INTEGER;
    const sorted = [...spaces].sort((a, b) => rank(a.id) - rank(b.id));
    set({
      spaces: sorted.map((s) => ({ ...s, memberCount: counts.get(s.id) ?? 1 })),
    });
  },

  createSpace: async (name, emoji, personal = false) => {
    const { data, error } = await supabase.rpc('create_space', {
      space_name: name,
      space_emoji: emoji,
      personal,
    });
    if (error) {
      throw friendlyError(
        error.message,
        '공간을 만들지 못했어요. 잠시 후 다시 시도해주세요.'
      );
    }
    await get().refreshSpaces();
    return data;
  },

  setPersonal: async (spaceId, personal) => {
    const { error } = await supabase.rpc('set_space_personal', {
      target_space: spaceId,
      personal,
    });
    if (error) {
      throw friendlyError(
        error.message,
        '바꾸지 못했어요. 잠시 후 다시 시도해주세요.'
      );
    }
    set({
      spaces: get().spaces.map((s) =>
        s.id === spaceId ? { ...s, is_personal: personal } : s
      ),
    });
  },

  joinSpace: async (code) => {
    const { data, error } = await supabase.rpc('join_space', { code });
    if (error) {
      throw friendlyError(
        error.message,
        '들어가지 못했어요. 잠시 후 다시 시도해주세요.'
      );
    }
    await get().refreshSpaces();
    return data;
  },

  leaveSpace: async (spaceId) => {
    const { error } = await supabase.rpc('leave_space', {
      target_space: spaceId,
    });
    if (error) throw new Error('나가지 못했어요. 잠시 후 다시 시도해주세요.');
    set({ spaces: get().spaces.filter((s) => s.id !== spaceId) });
  },

  reorderSpaces: async (orderedIds) => {
    const prev = get().spaces;
    const byId = new Map(prev.map((s) => [s.id, s]));
    set({
      spaces: orderedIds
        .map((id) => byId.get(id))
        .filter((s): s is Space => Boolean(s)),
    });
    const { error } = await supabase.rpc('set_space_order', {
      ordered: orderedIds,
    });
    if (error) {
      set({ spaces: prev });
      throw new Error('순서를 저장하지 못했어요. 잠시 후 다시 시도해주세요.');
    }
  },

  updateSpace: async (spaceId, { name, emoji, imageUri }) => {
    const prev = get().spaces.find((s) => s.id === spaceId);
    const changes: Partial<SpaceRow> = {};
    if (name !== undefined) changes.name = name;
    if (emoji !== undefined) changes.emoji = emoji;

    try {
      if (imageUri) {
        // 새 사진은 그 공간 폴더에 올린다 (공간 멤버만 볼 수 있다)
        changes.image_path = await uploadPhoto(imageUri, spaceId);
      } else if (imageUri === null) {
        changes.image_path = null;
      }
    } catch {
      throw new Error('사진을 올리지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      // 올렸든 못 올렸든 휴대폰에 복사해 둔 사진은 필요 없다
      if (imageUri) deletePhoto(imageUri);
    }

    const { error } = await supabase
      .from('spaces')
      .update(changes)
      .eq('id', spaceId);
    if (error) throw new Error('저장하지 못했어요. 잠시 후 다시 시도해주세요.');

    // 바뀌었거나 뺀 예전 사진은 지운다
    if ('image_path' in changes && prev?.image_path) {
      void removePhoto(prev.image_path).catch(() => {});
    }
    set({
      spaces: get().spaces.map((s) =>
        s.id === spaceId ? { ...s, ...changes } : s
      ),
    });
  },
}));

/** 지금 보고 있는 공간 (없으면 '나만 보기') */
export function useSpace(spaceId: string | null) {
  return useSpaceStore((s) => s.spaces.find((sp) => sp.id === spaceId) ?? null);
}
