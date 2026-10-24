import { create } from 'zustand';

import type { PlaceInfo } from '@/lib/bucket/types';

/**
 * 장소 검색 화면 → 담기 화면으로 고른 장소를 넘기는 통로.
 * 담기 화면이 받아 가면 take()로 비운다.
 */
type PlacePickState = {
  picked: PlaceInfo | null;
  pick: (place: PlaceInfo) => void;
  take: () => PlaceInfo | null;
};

export const usePlacePickStore = create<PlacePickState>((set, get) => ({
  picked: null,
  pick: (place) => set({ picked: place }),
  take: () => {
    const place = get().picked;
    set({ picked: null });
    return place;
  },
}));
