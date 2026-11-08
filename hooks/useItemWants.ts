import type { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect } from 'react';
import { create } from 'zustand';

import { noteFailure } from '@/lib/connection';
import { supabase } from '@/lib/supabase/client';
import type { ItemWantRow } from '@/lib/supabase/database.types';
import { useSpaceStore } from '@/store/useSpaceStore';

const EMPTY: ItemWantRow[] = [];

type WantsState = {
  /** 공간 → 그 공간 항목의 '하고 싶어요' */
  bySpace: Record<string, ItemWantRow[]>;
  setRows: (spaceId: string, rows: ItemWantRow[]) => void;
};

/** '하고 싶어요' (목록·항목·뽑기가 함께 본다). 폰에 저장하지 않는다 */
const useWantsStore = create<WantsState>()((set, get) => ({
  bySpace: {},
  setRows: (spaceId, rows) =>
    set({ bySpace: { ...get().bySpace, [spaceId]: rows } }),
}));

const same = (a: Partial<ItemWantRow>, b: Partial<ItemWantRow>) =>
  a.item_id === b.item_id && a.user_id === b.user_id;

/** 공간마다 실시간 연결 하나 (여러 화면이 같이 써도). 마지막 화면이 닫히면 끊는다 */
const channels = new Map<string, { channel: RealtimeChannel; users: number }>();

function watch(spaceId: string) {
  const open = channels.get(spaceId);
  if (open) {
    open.users += 1;
    return;
  }
  const rowsOf = () => useWantsStore.getState().bySpace[spaceId] ?? EMPTY;
  const setRows = (rows: ItemWantRow[]) =>
    useWantsStore.getState().setRows(spaceId, rows);
  const channel = supabase
    .channel(`wants:${spaceId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'item_wants',
        filter: `space_id=eq.${spaceId}`,
      },
      (payload) => {
        const row = payload.new as ItemWantRow;
        if (!rowsOf().some((r) => same(r, row))) setRows([...rowsOf(), row]);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'item_wants',
        filter: `space_id=eq.${spaceId}`,
      },
      (payload) => {
        const old = payload.old as Partial<ItemWantRow>;
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
    .from('item_wants')
    .select('*')
    .eq('space_id', spaceId);
  if (error) {
    noteFailure(error);
    return;
  }
  useWantsStore.getState().setRows(spaceId, data ?? []);
}

/**
 * 버킷리스트 항목의 '하고 싶어요'. 화면을 열 때 받고, 다른 사람이 누르면 바로 바뀐다.
 * spaceId가 없으면(혼자 쓰는 목록) 없다
 */
export function useItemWants(spaceId: string | null) {
  const wants = useWantsStore((s) =>
    spaceId ? (s.bySpace[spaceId] ?? EMPTY) : EMPTY
  );
  const userId = useSpaceStore((s) => s.userId);

  useEffect(() => {
    if (!spaceId) return;
    void load(spaceId);
    watch(spaceId);
    return () => unwatch(spaceId);
  }, [spaceId]);

  /** 이 항목을 하고 싶다고 한 사람들 (먼저 누른 순) */
  const wantersOf = (itemId: string) =>
    wants
      .filter((w) => w.item_id === itemId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((w) => w.user_id);
  const countOf = (itemId: string) =>
    wants.reduce((n, w) => n + Number(w.item_id === itemId), 0);
  const wantedByMe = (itemId: string) =>
    wants.some((w) => w.item_id === itemId && w.user_id === userId);

  /** 내 '하고 싶어요' 넣기/빼기 (먼저 화면에 보여주고, 못 올리면 되돌린다) */
  const toggle = async (itemId: string) => {
    if (!spaceId || !userId) return;
    const had = wantedByMe(itemId);
    const mine: ItemWantRow = {
      item_id: itemId,
      user_id: userId,
      space_id: spaceId,
      created_at: new Date().toISOString(),
    };
    const apply = (want: boolean) => {
      const { bySpace, setRows } = useWantsStore.getState();
      const rows = (bySpace[spaceId] ?? EMPTY).filter((w) => !same(w, mine));
      setRows(spaceId, want ? [...rows, mine] : rows);
    };
    apply(!had);
    const { error } = had
      ? await supabase
          .from('item_wants')
          .delete()
          .eq('item_id', itemId)
          .eq('user_id', userId)
      : await supabase
          .from('item_wants')
          .insert({ item_id: itemId, user_id: userId });
    if (error) {
      noteFailure(error);
      apply(had);
    }
  };

  return { rows: wants, wantersOf, countOf, wantedByMe, toggle };
}
