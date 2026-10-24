import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { deletePhoto } from '@/lib/bucket/photo';
import {
  DEFAULT_SETTING,
  type BucketInput,
  type BucketItem,
  type DoneRecord,
} from '@/lib/bucket/types';
import * as remote from '@/lib/supabase/bucketRemote';
import type { BucketItemRow } from '@/lib/supabase/database.types';

/**
 * 버킷리스트 저장소.
 * - 커플 연결 전: 휴대폰(AsyncStorage)에만 저장한다.
 * - 커플 연결 후(coupleId 있음): 휴대폰에 먼저 반영하고 서버에도 쓴다. 서버가 기준이고,
 *   휴대폰 저장은 앱을 켰을 때 바로 보여주기 위한 사본이다.
 */
type BucketState = {
  items: BucketItem[];
  /** 지금 동기화 중인 커플. null이면 휴대폰에만 저장 */
  coupleId: string | null;
  /** 이 휴대폰의 항목을 이미 서버로 옮긴 커플 (같은 항목을 두 번 올리지 않게) */
  uploadedCoupleId: string | null;

  addItem: (input: BucketInput) => string;
  updateItem: (id: string, input: BucketInput) => void;
  removeItem: (id: string) => void;
  /** 사진이 새로 바뀌었으면 서버에 올린 뒤 저장한다 */
  recordDone: (id: string, record: DoneRecord) => Promise<void>;
  /** 해낸 기록을 지우고 다시 버킷리스트로 돌린다 */
  clearDone: (id: string) => void;

  /** 커플이 연결되면 휴대폰 항목을 서버로 옮기고 서버 기준으로 맞춘다. null이면 연결 해제 */
  connect: (coupleId: string | null) => Promise<void>;
  /** 서버에서 전부 다시 받아온다 */
  pull: () => Promise<void>;
  /** 실시간: 상대(또는 나)가 바꾼 행 반영 */
  applyRemoteRow: (row: BucketItemRow) => void;
  applyRemoteDelete: (id: string) => void;
};

/** v1(장소만 있던 때) 데이터 모양 */
type V1Place = Omit<BucketItem, 'kind' | 'done' | 'setting'> & {
  visit: DoneRecord | null;
};

/** v2(실내/실외가 없던 때) 데이터 모양 */
type V2Item = Omit<BucketItem, 'setting'>;

/** 서버 쓰기 실패: 서버 기준으로 다시 맞춘다 */
function onRemoteError(e: unknown, pull: () => Promise<void>) {
  console.warn('[bucket] remote write failed', e);
  void pull().catch(() => {});
}

export const useBucketStore = create<BucketState>()(
  persist(
    (set, get) => {
      const findItem = (id: string) => get().items.find((it) => it.id === id);
      const replaceItem = (id: string, next: BucketItem) =>
        set({ items: get().items.map((it) => (it.id === id ? next : it)) });

      /** 커플이 연결돼 있으면 항목 하나를 서버에 저장한다 */
      const pushItem = (item: BucketItem | undefined) => {
        const { coupleId, pull } = get();
        if (!coupleId || !item) return;
        remote
          .upsertItems([item], coupleId)
          .catch((e) => onRemoteError(e, pull));
      };

      return {
        items: [],
        coupleId: null,
        uploadedCoupleId: null,

        addItem: (input) => {
          const id = remote.newItemId();
          const item: BucketItem = {
            ...input,
            id,
            createdAt: dayjs().toISOString(),
            done: null,
          };
          set({ items: [item, ...get().items] });
          pushItem(item);
          return id;
        },

        updateItem: (id, input) => {
          const prev = findItem(id);
          if (!prev) return;
          const next = { ...prev, ...input };
          replaceItem(id, next);
          pushItem(next);
        },

        removeItem: (id) => {
          const target = findItem(id);
          deletePhoto(target?.done?.photoUri);
          set({ items: get().items.filter((it) => it.id !== id) });

          const { coupleId, pull } = get();
          if (!coupleId) return;
          void remote.removePhoto(target?.done?.photoPath);
          remote.deleteItem(id).catch((e) => onRemoteError(e, pull));
        },

        recordDone: async (id, record) => {
          const target = findItem(id);
          if (!target) return;
          const prev = target.done;
          const { coupleId } = get();

          let next: DoneRecord = record;
          // 새로 고른 사진(서버 경로가 아직 없음)이면 먼저 올린다
          if (coupleId && record.photoUri && !record.photoPath) {
            const photoPath = await remote.uploadPhoto(
              record.photoUri,
              coupleId
            );
            next = { ...record, photoPath };
          }

          // 바뀌거나 빠진 예전 사진 정리
          if (prev?.photoUri && prev.photoUri !== next.photoUri) {
            deletePhoto(prev.photoUri);
          }
          if (
            coupleId &&
            prev?.photoPath &&
            prev.photoPath !== next.photoPath
          ) {
            void remote.removePhoto(prev.photoPath);
          }

          const item = { ...target, done: next };
          replaceItem(id, item);
          if (coupleId) await remote.upsertItems([item], coupleId);
        },

        clearDone: (id) => {
          const target = findItem(id);
          if (!target) return;
          deletePhoto(target.done?.photoUri);
          if (get().coupleId) void remote.removePhoto(target.done?.photoPath);
          const item = { ...target, done: null };
          replaceItem(id, item);
          pushItem(item);
        },

        connect: async (coupleId) => {
          set({ coupleId });
          if (!coupleId) {
            set({ uploadedCoupleId: null });
            return;
          }

          if (get().uploadedCoupleId !== coupleId) {
            // 이 휴대폰에만 있던 항목·사진을 커플 서버로 옮긴다
            const uploaded: BucketItem[] = [];
            for (const it of get().items) {
              let done = it.done;
              if (done?.photoUri && !done.photoPath) {
                try {
                  const photoPath = await remote.uploadPhoto(
                    done.photoUri,
                    coupleId
                  );
                  done = { ...done, photoPath };
                } catch (e) {
                  console.warn('[bucket] photo upload failed', e);
                }
              }
              uploaded.push({ ...it, id: remote.ensureUuid(it.id), done });
            }
            await remote.upsertItems(uploaded, coupleId);
            set({ items: uploaded, uploadedCoupleId: coupleId });
          }

          await get().pull();
        },

        pull: async () => {
          if (!get().coupleId) return;
          const rows = await remote.fetchItems();
          const localById = new Map(get().items.map((it) => [it.id, it]));
          set({
            items: rows.map((r) => remote.fromRow(r, localById.get(r.id))),
          });
        },

        applyRemoteRow: (row) => {
          const items = get().items;
          const local = items.find((it) => it.id === row.id);
          const next = remote.fromRow(row, local);
          set({
            items: local
              ? items.map((it) => (it.id === row.id ? next : it))
              : [next, ...items],
          });
        },

        applyRemoteDelete: (id) => {
          set({ items: get().items.filter((it) => it.id !== id) });
        },
      };
    },
    {
      // 이름은 처음 저장한 키를 그대로 써야 기존 데이터를 읽는다
      name: 'doit2-places',
      version: 3,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        items: state.items,
        uploadedCoupleId: state.uploadedCoupleId,
      }),
      migrate: (persisted, version) => {
        let items: V2Item[];
        if (version < 2) {
          // v1 → v2: 장소만 있던 데이터를 '갈 곳'으로, visit → done
          const old = (persisted as { places?: V1Place[] }).places ?? [];
          items = old.map(({ visit, ...rest }) => ({
            ...rest,
            kind: 'place',
            done: visit,
          }));
        } else {
          items = (persisted as { items?: V2Item[] }).items ?? [];
        }
        if (version < 3) {
          // v2 → v3: 실내/실외는 카테고리 기본값으로 채운다
          return {
            items: items.map((it): BucketItem => ({
              ...it,
              setting: DEFAULT_SETTING[it.category] ?? 'indoor',
            })),
            uploadedCoupleId: null,
          };
        }
        return persisted as {
          items: BucketItem[];
          uploadedCoupleId: string | null;
        };
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
