import type { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect } from 'react';
import { create } from 'zustand';

import { noteFailure } from '@/lib/connection';
import { notifySpace } from '@/lib/push';
import { supabase } from '@/lib/supabase/client';
import type { ItemDateVoteRow } from '@/lib/supabase/database.types';
import { useSpaceStore } from '@/store/useSpaceStore';

const EMPTY: ItemDateVoteRow[] = [];

/** 이번에 앱을 켜고 '날짜 골랐어요' 알림을 보낸 항목 (서버도 12시간에 한 번만 보낸다) */
const notified = new Set<string>();
/** '다 되는 날' 알림을 보낸 항목·날 */
const notifiedAll = new Set<string>();

type VotesState = {
  /** 공간 → 그 공간 항목의 날짜 표 */
  bySpace: Record<string, ItemDateVoteRow[]>;
  setRows: (spaceId: string, rows: ItemDateVoteRow[]) => void;
};

/** 같이 갈 날 표. 폰에 저장하지 않는다 */
const useVotesStore = create<VotesState>()((set, get) => ({
  bySpace: {},
  setRows: (spaceId, rows) =>
    set({ bySpace: { ...get().bySpace, [spaceId]: rows } }),
}));

const same = (a: Partial<ItemDateVoteRow>, b: Partial<ItemDateVoteRow>) =>
  a.item_id === b.item_id && a.user_id === b.user_id && a.day === b.day;

/** 공간마다 실시간 연결 하나. 마지막 화면이 닫히면 끊는다 */
const channels = new Map<string, { channel: RealtimeChannel; users: number }>();

function watch(spaceId: string) {
  const open = channels.get(spaceId);
  if (open) {
    open.users += 1;
    return;
  }
  const rowsOf = () => useVotesStore.getState().bySpace[spaceId] ?? EMPTY;
  const setRows = (rows: ItemDateVoteRow[]) =>
    useVotesStore.getState().setRows(spaceId, rows);
  const channel = supabase
    .channel(`date-votes:${spaceId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'item_date_votes',
        filter: `space_id=eq.${spaceId}`,
      },
      (payload) => {
        const row = payload.new as ItemDateVoteRow;
        if (!rowsOf().some((r) => same(r, row))) setRows([...rowsOf(), row]);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'item_date_votes',
        filter: `space_id=eq.${spaceId}`,
      },
      (payload) => {
        const old = payload.old as Partial<ItemDateVoteRow>;
        setRows(rowsOf().filter((r) => !same(r, old)));
      }
    )
    .subscribe();
  channels.set(spaceId, { channel, users: 1 });
}

function unwatch(spaceId: string) {
  const open = channels.get(spaceId);
  if (!open) return;
  open.users -= 1;
  if (open.users > 0) return;
  channels.delete(spaceId);
  void supabase.removeChannel(open.channel);
}

async function load(spaceId: string) {
  const { data, error } = await supabase
    .from('item_date_votes')
    .select('*')
    .eq('space_id', spaceId);
  if (error) {
    noteFailure(error);
    return;
  }
  useVotesStore.getState().setRows(spaceId, data ?? []);
}

/**
 * 같이 갈 날 맞추기: 사람마다 되는 날을 고른다. 다른 사람이 고르면 바로 바뀐다.
 * spaceId가 없으면(혼자 쓰는 목록) 없다
 */
export function useDateVotes(spaceId: string | null) {
  const rows = useVotesStore((s) =>
    spaceId ? (s.bySpace[spaceId] ?? EMPTY) : EMPTY
  );
  const userId = useSpaceStore((s) => s.userId);

  useEffect(() => {
    if (!spaceId) return;
    void load(spaceId);
    watch(spaceId);
    return () => unwatch(spaceId);
  }, [spaceId]);

  /** 이 항목의 표 (먼저 고른 순) */
  const votesOf = (itemId: string) =>
    rows
      .filter((r) => r.item_id === itemId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));

  /**
   * 내가 그 날 되는지 넣기/빼기 (먼저 화면에 보여주고, 못 올리면 되돌린다).
   * memberCount: 지금 공간 인원 (다 되는 날이 생겼는지 보려고)
   */
  const toggle = async (itemId: string, day: string, memberCount: number) => {
    if (!spaceId || !userId) return;
    const mine: ItemDateVoteRow = {
      item_id: itemId,
      user_id: userId,
      space_id: spaceId,
      day,
      created_at: new Date().toISOString(),
    };
    const current = () => useVotesStore.getState().bySpace[spaceId] ?? EMPTY;
    const had = current().some((r) => same(r, mine));
    const apply = (on: boolean) => {
      const next = current().filter((r) => !same(r, mine));
      useVotesStore.getState().setRows(spaceId, on ? [...next, mine] : next);
    };
    apply(!had);
    const { error } = had
      ? await supabase
          .from('item_date_votes')
          .delete()
          .eq('item_id', itemId)
          .eq('user_id', userId)
          .eq('day', day)
      : await supabase
          .from('item_date_votes')
          .insert({ item_id: itemId, user_id: userId, day });
    if (error) {
      noteFailure(error);
      apply(had);
      return;
    }
    if (had) return;
    // 이 날 모두 되면 '다 되는 날' 알림, 아니면 처음 고를 때 한 번 '날짜 골랐어요'
    const voters = new Set(
      current()
        .filter((r) => r.item_id === itemId && r.day === day)
        .map((r) => r.user_id)
    );
    const allKey = `${itemId}:${day}`;
    if (memberCount >= 2 && voters.size >= memberCount) {
      if (notifiedAll.has(allKey)) return;
      notifiedAll.add(allKey);
      notified.add(itemId);
      notifySpace(spaceId, 'dates', [itemId], { day });
    } else if (!notified.has(itemId)) {
      notified.add(itemId);
      notifySpace(spaceId, 'dates', [itemId], { day });
    }
  };

  /** 날을 정했으면 이 항목 표를 모두 비운다 (다시 맞출 때 처음부터) */
  const clear = async (itemId: string) => {
    if (!spaceId) return;
    const before = useVotesStore.getState().bySpace[spaceId] ?? EMPTY;
    useVotesStore.getState().setRows(
      spaceId,
      before.filter((r) => r.item_id !== itemId)
    );
    const { error } = await supabase
      .from('item_date_votes')
      .delete()
      .eq('item_id', itemId);
    if (error) {
      noteFailure(error);
      void load(spaceId);
    }
  };

  return { votesOf, toggle, clear };
}
