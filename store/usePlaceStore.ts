import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { deletePhoto } from '@/lib/place/photo';
import type { Place, PlaceInput, Visit } from '@/lib/place/types';

type PlaceState = {
  places: Place[];
  addPlace: (input: PlaceInput) => string;
  updatePlace: (id: string, input: PlaceInput) => void;
  removePlace: (id: string) => void;
  recordVisit: (id: string, visit: Visit) => void;
  /** 다녀온 기록을 지우고 다시 '갈 곳'으로 돌린다 */
  clearVisit: (id: string) => void;
};

function createId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export const usePlaceStore = create<PlaceState>()(
  persist(
    (set, get) => ({
      places: [],

      addPlace: (input) => {
        const id = createId();
        const place: Place = {
          ...input,
          id,
          createdAt: dayjs().toISOString(),
          visit: null,
        };
        set({ places: [place, ...get().places] });
        return id;
      },

      updatePlace: (id, input) => {
        set({
          places: get().places.map((p) =>
            p.id === id ? { ...p, ...input } : p
          ),
        });
      },

      removePlace: (id) => {
        const target = get().places.find((p) => p.id === id);
        deletePhoto(target?.visit?.photoUri);
        set({ places: get().places.filter((p) => p.id !== id) });
      },

      recordVisit: (id, visit) => {
        const prev = get().places.find((p) => p.id === id)?.visit;
        if (prev?.photoUri && prev.photoUri !== visit.photoUri) {
          deletePhoto(prev.photoUri);
        }
        set({
          places: get().places.map((p) => (p.id === id ? { ...p, visit } : p)),
        });
      },

      clearVisit: (id) => {
        const target = get().places.find((p) => p.id === id);
        deletePhoto(target?.visit?.photoUri);
        set({
          places: get().places.map((p) =>
            p.id === id ? { ...p, visit: null } : p
          ),
        });
      },
    }),
    {
      name: 'doit2-places',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ places: state.places }),
    }
  )
);

export function usePlace(id: string | undefined) {
  return usePlaceStore((state) => state.places.find((p) => p.id === id));
}

/** 저장된 데이터를 다 불러왔는지 */
export function usePlaceStoreHydrated() {
  return useSyncExternalStore(
    (onChange) => usePlaceStore.persist.onFinishHydration(onChange),
    () => usePlaceStore.persist.hasHydrated()
  );
}
