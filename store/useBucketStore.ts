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

/** '나만 보기'(공간 없음) 목록을 담는 캐시 키 */
export const LOCAL_KEY = 'local';

const cacheKey = (spaceId: string | null) => spaceId ?? LOCAL_KEY;

/**
 * 버킷리스트 저장소.
 * - 공간을 고르지 않았으면(spaceId null) '나만 보기': 이 휴대폰에만 저장한다.
 * - 공간을 고르면 그 공간의 목록을 보여준다. 휴대폰에 먼저 반영하고 서버에도 쓴다.
 *   서버가 기준이고, 휴대폰 캐시(공간별)는 앱을 켰을 때 바로 보여주기 위한 사본이다.
 */
type BucketState = {
  /** 지금 보고 있는 공간. null이면 나만 보기 */
  spaceId: string | null;
  /** 지금 공간의 항목 */
  items: BucketItem[];
  /** 다른 공간 항목 사본 (공간을 바꿀 때 바로 보여주려고) */
  cache: Record<string, BucketItem[]>;

  addItem: (input: BucketInput) => string;
  /** 여러 개를 한 번에 담는다 (해본 것 다시 담기). 입력 순서대로 맨 위에 쌓인다 */
  addItems: (inputs: BucketInput[]) => string[];
  updateItem: (id: string, input: BucketInput) => void;
  /** 여러 개를 한 번에 지운다 (사진도 같이) */
  removeItems: (ids: string[]) => void;
  /** 사진이 새로 바뀌었으면 서버에 올린 뒤 저장한다 */
  recordDone: (id: string, record: DoneRecord) => Promise<void>;
  /** 해낸 기록을 지우고 다시 버킷리스트로 돌린다 */
  clearDone: (id: string) => void;
  /** 여러 개의 기록을 한 번에 지운다 (항목은 버킷리스트로 돌아간다) */
  clearDoneMany: (ids: string[]) => void;

  /** 보고 있는 공간을 바꾼다. 캐시를 먼저 보여주고 서버에서 받아온다 */
  switchSpace: (spaceId: string | null) => Promise<void>;
  /** '나만 보기'에 있던 항목·사진을 공간으로 옮긴다 (처음 공간을 만들거나 들어갈 때) */
  moveLocalTo: (spaceId: string) => Promise<void>;
  /** 지금 공간을 서버에서 다시 받아온다 */
  pull: () => Promise<void>;
  /** 실시간: 다른 사람(또는 나)이 바꾼 행 반영 */
  applyRemoteRow: (row: BucketItemRow) => void;
  applyRemoteDelete: (id: string) => void;
};

/** v1(장소만 있던 때) 데이터 모양 */
type V1Place = Omit<BucketItem, 'kind' | 'done' | 'setting'> & {
  visit: DoneRecord | null;
};

/** v2(실내/실외가 없던 때) 데이터 모양 */
type V2Item = Omit<BucketItem, 'setting'>;

type Persisted = {
  spaceId: string | null;
  cache: Record<string, BucketItem[]>;
};

/** 서버 쓰기 실패: 서버 기준으로 다시 맞춘다 */
function onRemoteError(e: unknown, pull: () => Promise<void>) {
  console.warn('[bucket] remote write failed', e);
  void pull().catch(() => {});
}

/** 휴대폰 사진이 아직 서버에 없으면 올린다 */
async function withUploadedPhoto(
  done: DoneRecord | null,
  spaceId: string
): Promise<DoneRecord | null> {
  if (!done?.photoUri || done.photoPath) return done;
  try {
    const photoPath = await remote.uploadPhoto(done.photoUri, spaceId);
    return { ...done, photoPath };
  } catch (e) {
    console.warn('[bucket] photo upload failed', e);
    return done;
  }
}

export const useBucketStore = create<BucketState>()(
  persist(
    (set, get) => {
      const findItem = (id: string) => get().items.find((it) => it.id === id);
      const replaceItem = (id: string, next: BucketItem) =>
        set({ items: get().items.map((it) => (it.id === id ? next : it)) });

      /** 공간이면 항목들을 서버에 저장한다 */
      const pushItems = (items: BucketItem[]) => {
        const { spaceId, pull } = get();
        if (!spaceId || items.length === 0) return;
        remote.upsertItems(items, spaceId).catch((e) => onRemoteError(e, pull));
      };

      return {
        spaceId: null,
        items: [],
        cache: {},

        addItem: (input) => get().addItems([input])[0],

        addItems: (inputs) => {
          // 같은 시각으로 만들면 순서가 섞일 수 있어서 1ms씩 차이를 둔다 (먼저 고른 게 위로)
          const now = dayjs();
          const created: BucketItem[] = inputs.map((input, i) => ({
            ...input,
            id: remote.newItemId(),
            createdAt: now.subtract(i, 'millisecond').toISOString(),
            done: null,
          }));
          set({ items: [...created, ...get().items] });
          pushItems(created);
          return created.map((it) => it.id);
        },

        updateItem: (id, input) => {
          const prev = findItem(id);
          if (!prev) return;
          const next = { ...prev, ...input };
          replaceItem(id, next);
          pushItems([next]);
        },

        removeItems: (ids) => {
          const idSet = new Set(ids);
          const targets = get().items.filter((it) => idSet.has(it.id));
          for (const t of targets) deletePhoto(t.done?.photoUri);
          set({ items: get().items.filter((it) => !idSet.has(it.id)) });

          const { spaceId, pull } = get();
          if (!spaceId) return;
          for (const t of targets) void remote.removePhoto(t.done?.photoPath);
          remote.deleteItems(ids).catch((e) => onRemoteError(e, pull));
        },

        recordDone: async (id, record) => {
          const target = findItem(id);
          if (!target) return;
          const prev = target.done;
          const { spaceId } = get();

          // 공간이면 새로 고른 사진(서버 경로가 아직 없음)을 먼저 올린다
          const next: DoneRecord = spaceId
            ? ((await withUploadedPhoto(record, spaceId)) ?? record)
            : record;
          if (spaceId && next.photoUri && !next.photoPath) {
            throw new Error('photo upload failed');
          }

          // 바뀌거나 빠진 예전 사진 정리
          if (prev?.photoUri && prev.photoUri !== next.photoUri) {
            deletePhoto(prev.photoUri);
          }
          if (spaceId && prev?.photoPath && prev.photoPath !== next.photoPath) {
            void remote.removePhoto(prev.photoPath);
          }

          const item = { ...target, done: next };
          replaceItem(id, item);
          if (spaceId) await remote.upsertItems([item], spaceId);
        },

        clearDone: (id) => get().clearDoneMany([id]),

        clearDoneMany: (ids) => {
          const idSet = new Set(ids);
          const cleared: BucketItem[] = [];
          const { spaceId } = get();
          set({
            items: get().items.map((it) => {
              if (!idSet.has(it.id) || !it.done) return it;
              deletePhoto(it.done.photoUri);
              if (spaceId) void remote.removePhoto(it.done.photoPath);
              const next = { ...it, done: null };
              cleared.push(next);
              return next;
            }),
          });
          pushItems(cleared);
        },

        switchSpace: async (spaceId) => {
          const { spaceId: current, items, cache } = get();
          if (current !== spaceId) {
            set({
              spaceId,
              items: cache[cacheKey(spaceId)] ?? [],
              cache: { ...cache, [cacheKey(current)]: items },
            });
          }
          if (spaceId) await get().pull();
        },

        moveLocalTo: async (spaceId) => {
          const { spaceId: current, items, cache } = get();
          const localItems =
            current === null ? items : (cache[LOCAL_KEY] ?? []);
          if (localItems.length === 0) return;

          const uploaded: BucketItem[] = [];
          for (const it of localItems) {
            uploaded.push({
              ...it,
              id: remote.ensureUuid(it.id),
              done: await withUploadedPhoto(it.done, spaceId),
            });
          }
          await remote.upsertItems(uploaded, spaceId);

          // 옮긴 뒤 '나만 보기'는 비운다
          set({
            items: current === null ? [] : get().items,
            cache: { ...get().cache, [LOCAL_KEY]: [] },
          });
        },

        pull: async () => {
          const { spaceId } = get();
          if (!spaceId) return;
          const rows = await remote.fetchItems(spaceId);
          // 받는 사이에 다른 공간으로 바꿨으면 버린다
          if (get().spaceId !== spaceId) return;
          const localById = new Map(get().items.map((it) => [it.id, it]));
          set({
            items: rows.map((r) => remote.fromRow(r, localById.get(r.id))),
          });
        },

        applyRemoteRow: (row) => {
          if (row.space_id !== get().spaceId) return;
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
      version: 4,
      storage: createJSONStorage(() => AsyncStorage),
      // 지금 공간의 항목은 그 공간 캐시에 넣어서 저장한다
      partialize: (state): Persisted => ({
        spaceId: state.spaceId,
        cache: { ...state.cache, [cacheKey(state.spaceId)]: state.items },
      }),
      merge: (persisted, current) => {
        const p = persisted as Persisted | undefined;
        if (!p) return current;
        return {
          ...current,
          spaceId: p.spaceId,
          cache: p.cache,
          items: p.cache[cacheKey(p.spaceId)] ?? [],
        };
      },
      migrate: (persisted, version): Persisted => {
        let items: V2Item[];
        if (version < 2) {
          // v1 → v2: 장소만 있던 데이터를 '갈 곳'으로, visit → done
          const old = (persisted as { places?: V1Place[] }).places ?? [];
          items = old.map(({ visit, ...rest }) => ({
            ...rest,
            kind: 'place',
            done: visit,
          }));
        } else if (version < 4) {
          items = (persisted as { items?: V2Item[] }).items ?? [];
        } else {
          return persisted as Persisted;
        }
        // v2 → v3: 실내/실외는 카테고리 기본값으로
        // v3 → v4: 공간별 캐시. 예전 커플 서버는 없어졌으므로 전부 '나만 보기'로 돌린다
        const local = items.map((it): BucketItem => ({
          ...it,
          setting:
            (it as BucketItem).setting ??
            DEFAULT_SETTING[it.category] ??
            'indoor',
          done: it.done ? { ...it.done, photoPath: null } : null,
        }));
        return { spaceId: null, cache: { [LOCAL_KEY]: local } };
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
