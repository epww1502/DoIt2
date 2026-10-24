/**
 * 알림함(서버 notifications): 같은 공간 사람의 소식(담기·기록·평가).
 * 폰 안 알림(목표 날짜·주말 추천)은 useLocalInboxStore에 따로 있다.
 */
import { create } from 'zustand';

import { noteFailure } from '@/lib/connection';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import type { NotificationRow } from '@/lib/supabase/database.types';

/** 알림센터에 불러오는 개수 */
const LIMIT = 100;

type InboxState = {
  rows: NotificationRow[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: unknown;
  load: () => Promise<void>;
  /** 실시간으로 새 알림이 오면 맨 위에 */
  add: (row: NotificationRow) => void;
  /** 안 읽은 서버 알림을 모두 읽음으로 */
  markAllRead: () => Promise<void>;
  clear: () => void;
};

export const useInboxStore = create<InboxState>((set, get) => ({
  rows: [],
  status: 'idle',
  error: null,

  load: async () => {
    if (!isSupabaseConfigured) return;
    if (get().status !== 'ready') set({ status: 'loading', error: null });
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(LIMIT);
    if (error) {
      noteFailure(error);
      // 이미 받은 목록이 있으면 그대로 두고, 처음이면 오류로
      if (get().status !== 'ready') set({ status: 'error', error });
      return;
    }
    set({ rows: data, status: 'ready', error: null });
  },

  add: (row) => {
    if (get().rows.some((r) => r.id === row.id)) return;
    set({ rows: [row, ...get().rows].slice(0, LIMIT) });
  },

  markAllRead: async () => {
    const unread = get().rows.filter((r) => !r.read_at);
    if (unread.length === 0) return;
    const now = new Date().toISOString();
    // 화면은 바로 읽음으로 (서버 저장이 실패해도 다음에 다시 표시될 뿐이다)
    set({
      rows: get().rows.map((r) => (r.read_at ? r : { ...r, read_at: now })),
    });
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: now })
      .in(
        'id',
        unread.map((r) => r.id)
      );
    if (error) noteFailure(error);
  },

  clear: () => set({ rows: [], status: 'idle', error: null }),
}));
