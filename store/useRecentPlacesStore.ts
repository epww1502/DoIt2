import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { PlaceInfo } from '@/lib/bucket/types';

import { useBucketStore } from './useBucketStore';

/** 기억해 둘 최근 장소 수 */
const MAX_RECENT = 20;

/** 같은 장소인지 (카카오 id, 없으면 좌표로) */
export function placeKey(p: PlaceInfo) {
  return p.kakaoId ?? `${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`;
}

type RecentPlacesState = {
  /** 장소 검색·지도에서 고른 장소 (최근 순, 이 휴대폰에만) */
  picked: PlaceInfo[];
  add: (place: PlaceInfo) => void;
  clear: () => void;
};

export const useRecentPlacesStore = create<RecentPlacesState>()(
  persist(
    (set, get) => ({
      picked: [],
      add: (place) =>
        set({
          picked: [
            place,
            ...get().picked.filter((p) => placeKey(p) !== placeKey(place)),
          ].slice(0, MAX_RECENT),
        }),
      clear: () => set({ picked: [] }),
    }),
    {
      name: 'doit2-recent-places',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ picked: s.picked }),
    }
  )
);

/**
 * 최근 장소: 최근에 고른 장소 → 지금 공간의 항목·기록에 붙은 장소(최근 순).
 * 같은 장소는 한 번만, 최대 20곳.
 */
export function useRecentPlaces() {
  const picked = useRecentPlacesStore((s) => s.picked);
  const items = useBucketStore((s) => s.items);
  return useMemo(() => {
    const fromItems = items
      .filter((it) => it.place)
      .sort((a, b) => {
        const at = a.done?.date ?? a.createdAt;
        const bt = b.done?.date ?? b.createdAt;
        return at < bt ? 1 : -1;
      })
      .map((it) => it.place!);
    const seen = new Set<string>();
    const result: PlaceInfo[] = [];
    for (const p of [...picked, ...fromItems]) {
      const key = placeKey(p);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(p);
      if (result.length >= MAX_RECENT) break;
    }
    return result;
  }, [picked, items]);
}
