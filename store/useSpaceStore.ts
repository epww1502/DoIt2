import { isAuthRetryableFetchError } from '@supabase/supabase-js';
import { create } from 'zustand';

import { deletePhoto } from '@/lib/bucket/photo';
import {
  deleteMyAccount,
  ensureAccountCode,
  InvalidAccountCodeError,
  signInWithAccountCode,
} from '@/lib/supabase/account';
import { noteFailure } from '@/lib/connection';
import { clearSavedPhotos } from '@/lib/photoCache';
import { removePhoto, uploadPhoto } from '@/lib/supabase/bucketRemote';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import type { SpaceRow } from '@/lib/supabase/database.types';
import { useSettingsStore } from '@/store/useSettingsStore';

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
  too_many_attempts: '코드를 여러 번 틀렸어요. 1시간쯤 뒤에 다시 시도해주세요.',
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

/** 이 폰에 저장된 설정(계정 코드 포함)을 다 읽을 때까지 기다린다 */
function settingsHydrated() {
  if (useSettingsStore.persist.hasHydrated()) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const unsub = useSettingsStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}

let issuingCode = false;
/** 서버에 코드가 이미 있다고 확인한 계정 (이번 실행 동안 다시 묻지 않는다) */
let codeExistsFor: string | null = null;

/**
 * 이 폰에 계정 코드가 없으면, 서버에도 없을 때만 새로 만들어 저장해 둔다.
 * 로그인이 사라져도 이 코드로 같은 계정에 다시 들어간다.
 * 서버에 이미 있으면(예전에 만들어 폰 밖에 적어 둔 코드) 그 코드를 그대로 살려 둔다.
 * 다른 계정의 코드가 저장돼 있으면 건드리지 않는다 (그 계정으로 돌아갈 열쇠라서).
 */
export async function keepAccountCode(userId: string) {
  if (
    issuingCode ||
    codeExistsFor === userId ||
    useSettingsStore.getState().accountCode
  ) {
    return;
  }
  issuingCode = true;
  try {
    const code = await ensureAccountCode();
    if (!code) {
      codeExistsFor = userId;
      return;
    }
    // 만드는 사이 다른 계정으로 바뀌었으면 저장하지 않는다
    if (useSpaceStore.getState().userId === userId) {
      useSettingsStore.getState().setAccountCode({ userId, code });
    }
  } catch (e) {
    // 다음에 켤 때 다시 만든다
    noteFailure(e);
  } finally {
    issuingCode = false;
  }
}

export const useSpaceStore = create<SpaceState>((set, get) => {
  /** 공간을 만들거나 들어간 뒤 목록을 다시 받는다. 실패하면 받은 공간만 목록에 넣어둔다 */
  const refreshOrAdd = async (row: SpaceRow) => {
    try {
      await get().refreshSpaces();
    } catch (e) {
      noteFailure(e);
      if (!get().spaces.some((sp) => sp.id === row.id)) {
        set({ spaces: [...get().spaces, { ...row, memberCount: 1 }] });
      }
    }
  };

  return {
    status: isSupabaseConfigured ? 'loading' : 'unconfigured',
    userId: null,
    spaces: [],

    init: async () => {
      if (!isSupabaseConfigured) return;
      set({ status: 'loading' });
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        // 저장된 로그인의 토큰을 새로 받다가 인터넷 때문에 실패했다. 새 계정을 만들면
        // 쓰던 계정 위에 덮어쓰니, 오류로 두고 다시 연결되면 다시 시도한다
        if (isAuthRetryableFetchError(sessionError)) throw sessionError;
        let userId = data.session?.user.id ?? null;
        if (!userId) {
          // 이메일·비밀번호 없이 시작한다 (나중에 카카오·Apple 로그인을 이어 붙일 수 있다)
          const { data: signIn, error } =
            await supabase.auth.signInAnonymously();
          if (error) throw error;
          userId = signIn.user?.id ?? null;
          // 로그인이 사라졌지만 이 폰에 계정 코드가 있다 → 그 계정으로 돌아간다
          // (코드로 불러오기는 로그인한 상태에서만 돼서 잠깐 익명으로 들어간 뒤에 한다)
          await settingsHydrated();
          const saved = useSettingsStore.getState().accountCode;
          if (saved && saved.userId !== userId) {
            try {
              userId = await signInWithAccountCode(saved.code);
            } catch (e) {
              if (!(e instanceof InvalidAccountCodeError)) {
                // 인터넷 문제: 잠깐 들어간 익명 계정을 이 폰에서 지워야 다음에 다시 코드로 돌아간다
                await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
                throw e;
              }
              // 코드를 더 이상 못 쓴다 (계정을 지웠거나 다른 폰에서 새 코드를 만듦)
              useSettingsStore.getState().setAccountCode(null);
            }
          }
        }
        set({ userId });
        await get().refreshSpaces();
        set({ status: 'ready' });
        if (userId) void keepAccountCode(userId);
      } catch (e) {
        console.warn('[space] init failed', e);
        noteFailure(e);
        set({ status: 'error' });
      }
    },

    restoreAccount: async (code) => {
      const userId = await signInWithAccountCode(code);
      set({ userId, spaces: [] });
      // 다음에 로그인이 사라져도 이 계정으로 돌아오게 코드를 저장해 둔다
      useSettingsStore.getState().setAccountCode({ userId, code });
      // 다른 계정으로 바꿨으면 예전 계정의 사진을 남기지 않는다
      void clearSavedPhotos();
      try {
        await get().refreshSpaces();
        set({ status: 'ready' });
      } catch (e) {
        // 계정은 불러왔지만 공간 목록을 못 받았다. '없음'처럼 보이지 않게 오류로 둔다
        // (설정의 공간 카드에서 다시 시도하거나, 다시 연결되면 저절로 다시 받는다)
        noteFailure(e);
        set({ status: 'error' });
      }
    },

    deleteAccount: async () => {
      await deleteMyAccount();
      set({ userId: null, spaces: [] });
      // 지운 계정의 코드로 되돌아가지 않게
      useSettingsStore.getState().setAccountCode(null);
      void clearSavedPhotos();
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
          supabase
            .from('space_members')
            .select('space_id, user_id, sort_order'),
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
        spaces: sorted.map((s) => ({
          ...s,
          memberCount: counts.get(s.id) ?? 1,
        })),
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
      // 만들기는 이미 됐다. 목록 갱신이 실패해도 성공으로 둔다 (다시 누르면 공간이 하나 더 생긴다)
      await refreshOrAdd(data);
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
      // 들어가기는 이미 됐다. 목록 갱신이 실패해도 성공으로 둔다
      await refreshOrAdd(data);
      return data;
    },

    leaveSpace: async (spaceId) => {
      const { error } = await supabase.rpc('leave_space', {
        target_space: spaceId,
      });
      if (error) throw new Error('나가지 못했어요. 잠시 후 다시 시도해주세요.');
      set({ spaces: get().spaces.filter((s) => s.id !== spaceId) });
      // 그 공간 사람들 사진을 폰에 남기지 않는다
      void clearSavedPhotos();
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
      } catch (e) {
        // 고른 사진은 지우지 않는다 (다시 시도할 때 그대로 올린다)
        noteFailure(e);
        throw new Error('사진을 올리지 못했어요. 잠시 후 다시 시도해주세요.');
      }

      const { error } = await supabase
        .from('spaces')
        .update(changes)
        .eq('id', spaceId);
      if (error) {
        noteFailure(error);
        throw new Error('저장하지 못했어요. 잠시 후 다시 시도해주세요.');
      }
      // 서버에 올렸으니 휴대폰에 복사해 둔 사진은 필요 없다
      if (imageUri) deletePhoto(imageUri);

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
  };
});

/** 지금 보고 있는 공간 (없으면 '나만 보기') */
export function useSpace(spaceId: string | null) {
  return useSpaceStore((s) => s.spaces.find((sp) => sp.id === spaceId) ?? null);
}
