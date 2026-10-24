import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { deletePhoto } from '@/lib/bucket/photo';
import type { BucketInput, BucketItem, DoneRecord } from '@/lib/bucket/types';

type BucketState = {
  items: BucketItem[];
  addItem: (input: BucketInput) => string;
  updateItem: (id: string, input: BucketInput) => void;
  removeItem: (id: string) => void;
  recordDone: (id: string, record: DoneRecord) => void;
  /** 해낸 기록을 지우고 다시 버킷리스트로 돌린다 */
  clearDone: (id: string) => void;
};

function createId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** v1(장소만 있던 때) 데이터 모양 */
type V1Place = Omit<BucketItem, 'kind' | 'done'> & {
  visit: DoneRecord | null;
};

export const useBucketStore = create<BucketState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (input) => {
        const id = createId();
        const item: BucketItem = {
          ...input,
          id,
          createdAt: dayjs().toISOString(),
          done: null,
        };
        set({ items: [item, ...get().items] });
        return id;
      },

      updateItem: (id, input) => {
        set({
          items: get().items.map((it) =>
            it.id === id ? { ...it, ...input } : it
          ),
        });
      },

      removeItem: (id) => {
        const target = get().items.find((it) => it.id === id);
        deletePhoto(target?.done?.photoUri);
        set({ items: get().items.filter((it) => it.id !== id) });
      },

      recordDone: (id, record) => {
        const prev = get().items.find((it) => it.id === id)?.done;
        if (prev?.photoUri && prev.photoUri !== record.photoUri) {
          deletePhoto(prev.photoUri);
        }
        set({
          items: get().items.map((it) =>
            it.id === id ? { ...it, done: record } : it
          ),
        });
      },

      clearDone: (id) => {
        const target = get().items.find((it) => it.id === id);
        deletePhoto(target?.done?.photoUri);
        set({
          items: get().items.map((it) =>
            it.id === id ? { ...it, done: null } : it
          ),
        });
      },
    }),
    {
      // 이름은 처음 저장한 키를 그대로 써야 기존 데이터를 읽는다
      name: 'doit2-places',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ items: state.items }),
      migrate: (persisted, version) => {
        if (version < 2) {
          const old = (persisted as { places?: V1Place[] }).places ?? [];
          const items: BucketItem[] = old.map(({ visit, ...rest }) => ({
            ...rest,
            kind: 'place',
            done: visit,
          }));
          return { items };
        }
        return persisted as { items: BucketItem[] };
      },
    }
  )
);

export function useBucketItem(id: string | undefined) {
  return useBucketStore((state) => state.items.find((it) => it.id === id));
}

/** 저장된 데이터를 다 불러왔는지 */
export function useBucketStoreHydrated() {
  return useSyncExternalStore(
    (onChange) => useBucketStore.persist.onFinishHydration(onChange),
    () => useBucketStore.persist.hasHydrated()
  );
}
