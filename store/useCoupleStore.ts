import { create } from 'zustand';

import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import type { CoupleRow } from '@/lib/supabase/database.types';

export type CoupleStatus =
  /** .env에 Supabase 값이 없다 → 휴대폰에만 저장 */
  | 'unconfigured'
  | 'loading'
  | 'ready'
  /** 로그인하지 못했다 (익명 로그인이 꺼져 있거나 인터넷 문제) */
  | 'error';

type CoupleState = {
  status: CoupleStatus;
  userId: string | null;
  couple: CoupleRow | null;
  /** 커플 방에 들어온 사람 수 (1이면 상대를 기다리는 중) */
  memberCount: number;

  init: () => Promise<void>;
  refreshCouple: () => Promise<void>;
  createCouple: () => Promise<void>;
  /** 실패하면 사용자에게 보여줄 문구를 담은 Error를 던진다 */
  joinCouple: (code: string) => Promise<void>;
  leaveCouple: () => Promise<void>;
};

const JOIN_ERRORS: Record<string, string> = {
  invalid_code: '초대 코드가 맞지 않아요. 다시 확인해주세요.',
  couple_full: '이미 두 명이 연결된 커플이에요.',
  already_in_couple:
    '이미 다른 커플에 연결돼 있어요. 설정에서 연결을 끊고 다시 시도해주세요.',
};

export const useCoupleStore = create<CoupleState>((set, get) => ({
  status: isSupabaseConfigured ? 'loading' : 'unconfigured',
  userId: null,
  couple: null,
  memberCount: 0,

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
      await get().refreshCouple();
      set({ status: 'ready' });
    } catch (e) {
      console.warn('[couple] init failed', e);
      set({ status: 'error' });
    }
  },

  refreshCouple: async () => {
    // RLS 때문에 내가 속한 커플만 보인다
    const { data: couple, error } = await supabase
      .from('couples')
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!couple) {
      set({ couple: null, memberCount: 0 });
      return;
    }
    const { count } = await supabase
      .from('couple_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('couple_id', couple.id);
    set({ couple, memberCount: count ?? 1 });
  },

  createCouple: async () => {
    const { error } = await supabase.rpc('create_couple');
    if (error)
      throw new Error('커플 방을 만들지 못했어요. 잠시 후 다시 시도해주세요.');
    await get().refreshCouple();
  },

  joinCouple: async (code) => {
    const { error } = await supabase.rpc('join_couple', { code });
    if (error) {
      const key = Object.keys(JOIN_ERRORS).find((k) =>
        error.message.includes(k)
      );
      throw new Error(
        key ? JOIN_ERRORS[key] : '연결하지 못했어요. 잠시 후 다시 시도해주세요.'
      );
    }
    await get().refreshCouple();
  },

  leaveCouple: async () => {
    const { error } = await supabase.rpc('leave_couple');
    if (error)
      throw new Error('연결을 끊지 못했어요. 잠시 후 다시 시도해주세요.');
    set({ couple: null, memberCount: 0 });
  },
}));
