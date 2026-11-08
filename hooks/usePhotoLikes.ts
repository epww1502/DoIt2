import { useEffect } from 'react';
import { create } from 'zustand';

import { noteFailure } from '@/lib/connection';
import { notifySpace } from '@/lib/push';
import { supabase } from '@/lib/supabase/client';
import type { PhotoLikeRow } from '@/lib/supabase/database.types';
import { useSpaceStore } from '@/store/useSpaceStore';

/** 이번에 앱을 켠 동안 하트 알림을 보낸 사진 (눌렀다 풀었다 해도 알림은 한 번) */
const notified = new Set<string>();
const EMPTY: PhotoLikeRow[] = [];

type PhotoLikesState = {
  /** 공간 → 그 공간 기록 사진의 하트들 */
  bySpace: Record<string, PhotoLikeRow[]>;
  load: (spaceId: string) => Promise<void>;
  setRows: (spaceId: string, rows: PhotoLikeRow[]) => void;
};

/**
 * 공간 기록 사진의 하트 (앨범·기록 사진·크게 보기가 함께 본다.
 * 크게 보기에서 누르면 앨범 숫자도 바로 바뀐다). 폰에 저장하지 않는다
 */
const usePhotoLikesStore = create<PhotoLikesState>()((set, get) => ({
  bySpace: {},
  load: async (spaceId) => {
    const { data, error } = await supabase
      .from('photo_likes')
      .select('*')
      .eq('space_id', spaceId);
    if (error) {
      noteFailure(error);
      return;
    }
    get().setRows(spaceId, data ?? []);
  },
  setRows: (spaceId, rows) =>
    set({ bySpace: { ...get().bySpace, [spaceId]: rows } }),
}));

/**
 * 공간 기록 사진의 하트. 화면을 열 때 새로 받는다.
 * spaceId가 없으면(혼자 쓰는 목록) 하트가 없다
 */
export function usePhotoLikes(spaceId: string | null) {
  const likes = usePhotoLikesStore((s) =>
    spaceId ? (s.bySpace[spaceId] ?? EMPTY) : EMPTY
  );
  const userId = useSpaceStore((s) => s.userId);

  useEffect(() => {
    if (spaceId) void usePhotoLikesStore.getState().load(spaceId);
  }, [spaceId]);

  /** 이 사진에 하트를 누른 사람들 (먼저 누른 순) */
  const likersOf = (path: string | null) =>
    path
      ? likes
          .filter((l) => l.photo_path === path)
          .sort((a, b) => a.created_at.localeCompare(b.created_at))
          .map((l) => l.user_id)
      : [];
  const countOf = (path: string | null) => likersOf(path).length;
  const likedByMe = (path: string | null) =>
    Boolean(path) &&
    likes.some((l) => l.photo_path === path && l.user_id === userId);

  /** 내 하트 넣기/빼기 (먼저 화면에 보여주고, 못 올리면 되돌린다) */
  const toggle = async (
    path: string,
    itemId: string,
    /** 사진을 올린 사람 (내 사진이면 알리지 않는다) */
    by?: string | null
  ) => {
    if (!spaceId || !userId) return;
    const had = likedByMe(path);
    const mine: PhotoLikeRow = {
      photo_path: path,
      user_id: userId,
      item_id: itemId,
      space_id: spaceId,
      created_at: new Date().toISOString(),
    };
    const without = (rows: PhotoLikeRow[]) =>
      rows.filter((l) => !(l.photo_path === path && l.user_id === userId));
    const apply = (liked: boolean) => {
      const { bySpace, setRows } = usePhotoLikesStore.getState();
      const rows = without(bySpace[spaceId] ?? EMPTY);
      setRows(spaceId, liked ? [...rows, mine] : rows);
    };
    apply(!had);

    const { error } = had
      ? await supabase
          .from('photo_likes')
          .delete()
          .eq('photo_path', path)
          .eq('user_id', userId)
      : await supabase
          .from('photo_likes')
          .insert({ photo_path: path, item_id: itemId, user_id: userId });
    if (error) {
      noteFailure(error);
      apply(had);
      return;
    }
    if (!had && by && by !== userId && !notified.has(path)) {
      notified.add(path);
      notifySpace(spaceId, 'liked', [itemId], { photoPath: path });
    }
  };

  return { likersOf, countOf, likedByMe, toggle };
}
