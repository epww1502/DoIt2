import { useEffect, useState } from 'react';

import { noteFailure } from '@/lib/connection';
import { notifySpace } from '@/lib/push';
import { supabase } from '@/lib/supabase/client';
import type { PhotoLikeRow } from '@/lib/supabase/database.types';
import { useSpaceStore } from '@/store/useSpaceStore';

/** 이번에 앱을 켠 동안 하트 알림을 보낸 사진 (눌렀다 풀었다 해도 알림은 한 번) */
const notified = new Set<string>();

/**
 * 공간 기록 사진의 하트. paths 사진들의 하트를 받아 두고, toggle로 내 하트를 넣거나 뺀다.
 * spaceId가 없으면(혼자 쓰는 목록) 아무것도 하지 않는다
 */
export function usePhotoLikes(spaceId: string | null, paths: string[]) {
  const [likes, setLikes] = useState<PhotoLikeRow[]>([]);
  const userId = useSpaceStore((s) => s.userId);
  const key = paths.join('|');

  useEffect(() => {
    if (!spaceId || !key) return;
    let cancelled = false;
    void supabase
      .from('photo_likes')
      .select('*')
      .in('photo_path', key.split('|'))
      .then(({ data, error }) => {
        if (error) {
          noteFailure(error);
          return;
        }
        if (!cancelled) setLikes(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [spaceId, key]);

  const countOf = (path: string) =>
    likes.filter((l) => l.photo_path === path).length;
  const likedByMe = (path: string) =>
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
    setLikes((rows) => (had ? without(rows) : [...without(rows), mine]));

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
      setLikes((rows) => (had ? [...without(rows), mine] : without(rows)));
      return;
    }
    if (!had && by && by !== userId && !notified.has(path)) {
      notified.add(path);
      notifySpace(spaceId, 'liked', [itemId], { photoPath: path });
    }
  };

  return { countOf, likedByMe, toggle };
}
