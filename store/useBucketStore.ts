import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { deletePhoto } from '@/lib/bucket/photo';
import {
  DEFAULT_SETTING,
  recordPhotos,
  withRecordPhotos,
  type BucketInput,
  type BucketItem,
  type DoneRecord,
  type ItemReview,
  type RecordPhoto,
} from '@/lib/bucket/types';
import {
  isNetworkError,
  noteFailure,
  useConnectionStore,
} from '@/lib/connection';
import { notifySpace } from '@/lib/push';
import * as remote from '@/lib/supabase/bucketRemote';
import { myReview } from '@/lib/bucket/reviews';
import type {
  BucketItemRow,
  ItemReviewRow,
} from '@/lib/supabase/database.types';
import {
  pendingFor,
  useOutboxStore,
  type OutboxEntry,
} from '@/store/useOutboxStore';
import { useSpaceStore } from '@/store/useSpaceStore';

/** '나만 보기'(공간 없음) 목록을 담는 캐시 키 */
export const LOCAL_KEY = 'local';

const cacheKey = (spaceId: string | null) => spaceId ?? LOCAL_KEY;

/**
 * 버킷리스트 저장소.
 * - 공간을 고르지 않았으면(spaceId null) '나만 보기': 이 휴대폰에만 저장한다.
 * - 공간을 고르면 그 공간의 목록을 보여준다. 휴대폰에 먼저 반영하고 서버에도 쓴다.
 *   서버가 기준이고, 휴대폰 캐시(공간별)는 앱을 켰을 때 바로 보여주기 위한 사본이다.
 * - 서버에 쓰는 변경은 모두 대기열(useOutboxStore)에 먼저 넣고 바로 올린다.
 *   오프라인이면 대기열에 남았다가 다시 연결될 때 올라가고, 그 전까지는 서버 목록이 덮어쓰지 않는다.
 */
type BucketState = {
  /** 지금 보고 있는 공간. null이면 나만 보기 */
  spaceId: string | null;
  /** 지금 공간의 항목 */
  items: BucketItem[];
  /** 다른 공간 항목 사본 (공간을 바꿀 때 바로 보여주려고) */
  cache: Record<string, BucketItem[]>;
  /** 지금 공간 목록을 서버에서 받는 중인지, 실패했는지 (휴대폰에 저장하지 않는다) */
  sync: { status: 'idle' | 'loading' | 'error'; error: unknown };

  addItem: (input: BucketInput) => string;
  /** 여러 개를 한 번에 담는다 (함께한 것 다시 담기). 입력 순서대로 맨 위에 쌓인다 */
  addItems: (inputs: BucketInput[]) => string[];
  /**
   * 다른 곳(공간 id, null이면 '나만 보기')에 담는다. 지금 보고 있는 곳이면 addItems와 같다.
   * 공간이면 서버 저장이 끝날 때까지 기다린다 (실패하면 던진다)
   */
  addItemsTo: (target: string | null, inputs: BucketInput[]) => Promise<void>;
  /** 바꿀 칸만 넘겨도 된다 */
  updateItem: (id: string, input: Partial<BucketInput>) => void;
  /** 여러 개를 한 번에 지운다 (사진도 같이) */
  removeItems: (ids: string[]) => void;
  /** 사진이 새로 바뀌었으면 서버에 올린 뒤 저장한다 */
  recordDone: (id: string, record: DoneRecord) => Promise<void>;
  /**
   * 공간: 내 평가만 따로 남기거나 건너뛴다 (rating null이면 건너뜀).
   * 다른 사람이 먼저 기록한 항목에서 쓴다. 날짜·사진은 그대로 둔다
   */
  saveMyReview: (
    id: string,
    review: { rating: number | null; review: string }
  ) => void;
  /**
   * 해낸 기록을 지운다. '나만 보기'는 버킷리스트로 돌린다.
   * 공간은 내 평가만 지우고, 아무도 평가가 안 남으면 기록(날짜·사진)도 지워 버킷리스트로 돌린다
   */
  clearDone: (id: string) => void;
  /** 여러 개의 기록을 한 번에 지운다 (항목은 버킷리스트로 돌아간다) */
  clearDoneMany: (ids: string[]) => void;

  /** 보고 있는 공간을 바꾼다. 캐시를 먼저 보여주고 서버에서 받아온다 */
  switchSpace: (spaceId: string | null) => Promise<void>;
  /** '나만 보기'에 있던 항목·사진을 공간으로 옮긴다 (처음 공간을 만들거나 들어갈 때) */
  moveLocalTo: (spaceId: string) => Promise<void>;
  /** 이 폰에 있는 모든 목록·기록·사진을 지운다 (계정 삭제 때) */
  resetAll: () => void;
  /** 지금 공간을 서버에서 다시 받아온다 (대기 중인 변경을 먼저 올린다) */
  pull: () => Promise<void>;
  /** 대기열에 남은 변경을 서버에 올린다. 다 올라가면 true */
  flushPending: () => Promise<boolean>;
  /** 실시간: 다른 사람(또는 나)이 바꾼 행 반영 */
  applyRemoteRow: (row: BucketItemRow) => void;
  applyRemoteDelete: (id: string) => void;
  /** 실시간: 누가 평가를 남기거나 고치거나 지웠다 */
  applyRemoteReview: (row: ItemReviewRow) => void;
  applyRemoteReviewDelete: (old: {
    item_id?: string;
    user_id?: string;
  }) => void;
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

/**
 * 휴대폰 사진 중 아직 서버에 없는 것을 올린다 (실패한 사진은 경로 없이 남는다).
 * throwOnNetwork면 인터넷 문제로 실패했을 때 던진다 (대기열이 나중에 다시 올리게).
 * 파일이 없어지는 등 다른 이유로 실패한 사진은 그 폰에서만 보이고 계속 붙잡지 않는다.
 */
async function withUploadedPhoto(
  done: DoneRecord | null,
  spaceId: string,
  throwOnNetwork = false
): Promise<DoneRecord | null> {
  if (!done) return done;
  const photos = recordPhotos(done);
  if (!photos.some((p) => p.uri && !p.path)) return done;
  const uploaded: RecordPhoto[] = [];
  for (const photo of photos) {
    if (photo.path || !photo.uri) {
      uploaded.push(photo);
      continue;
    }
    try {
      uploaded.push({
        ...photo,
        path: await remote.uploadPhoto(photo.uri, spaceId),
      });
    } catch (e) {
      if (throwOnNetwork && isNetworkError(e)) throw e;
      console.warn('[bucket] photo upload failed', e);
      uploaded.push(photo);
    }
  }
  return withRecordPhotos(done, uploaded);
}

/** 기록의 사진을 휴대폰과 (공간이면) 서버에서 지운다 */
function deleteRecordPhotos(done: DoneRecord | null, spaceId: string | null) {
  const photos = recordPhotos(done);
  for (const photo of photos) deletePhoto(photo.uri);
  if (spaceId) {
    useOutboxStore.getState().queuePhotoRemoval(photos.map((p) => p.path));
  }
}

/** 올리는 중이면 같은 작업을 기다린다 (두 번 올리지 않게) */
let flushing: Promise<boolean> | null = null;
let flushAgain = false;

export const useBucketStore = create<BucketState>()(
  persist(
    (set, get) => {
      const findItem = (id: string) => get().items.find((it) => it.id === id);
      const replaceItem = (id: string, next: BucketItem) =>
        set({ items: get().items.map((it) => (it.id === id ? next : it)) });

      /** 대기열에 넣은 변경을 바로 올려본다 (실패하면 대기열에 남는다) */
      const flushSoon = () => {
        void get().flushPending();
      };

      /** 공간이면 항목들을 서버에 저장한다 */
      const pushItems = (items: BucketItem[], notify?: 'added' | 'done') => {
        const { spaceId } = get();
        if (!spaceId || items.length === 0) return;
        useOutboxStore.getState().queueUpsert(
          spaceId,
          items.map((it) => it.id),
          notify
        );
        flushSoon();
      };

      /** 어느 공간(지금 보는 곳이면 items, 아니면 캐시)의 항목을 찾는다 */
      const findIn = (spaceId: string, id: string) => {
        const list =
          get().spaceId === spaceId
            ? get().items
            : (get().cache[spaceId] ?? []);
        return list.find((it) => it.id === id);
      };

      /** 사진 경로가 생긴 항목을 그 공간 목록에 반영한다 */
      const patchIn = (spaceId: string, next: BucketItem) => {
        const swap = (list: BucketItem[]) =>
          list.map((it) => (it.id === next.id ? next : it));
        if (get().spaceId === spaceId) {
          set({ items: swap(get().items) });
        } else {
          const cache = get().cache;
          set({ cache: { ...cache, [spaceId]: swap(cache[spaceId] ?? []) } });
        }
      };

      /** 한 공간의 대기 변경을 올린다. 네트워크 문제면 던진다 */
      const flushSpace = async (spaceId: string, entries: OutboxEntry[]) => {
        const outbox = useOutboxStore.getState();
        const deletes = entries.filter((e) => e.op === 'delete');
        const upserts = entries.filter((e) => e.op === 'upsert');
        const reviews = entries.filter((e) => e.op === 'review');

        if (deletes.length > 0) {
          try {
            await remote.deleteItems(deletes.map((e) => e.itemId));
          } catch (e) {
            if (isNetworkError(e)) throw e;
            // 서버가 거절한 변경은 계속 붙잡고 있지 않는다
            console.warn('[outbox] delete rejected', e);
          }
          outbox.settle(deletes);
        }

        const ready: { entry: OutboxEntry; item: BucketItem }[] = [];
        const missing: OutboxEntry[] = [];
        for (const entry of upserts) {
          const item = findIn(spaceId, entry.itemId);
          if (!item) {
            missing.push(entry);
            continue;
          }
          // 오프라인일 때 고른 사진을 지금 올린다. 인터넷 문제로 못 올리면 다음에 다시
          const done = await withUploadedPhoto(item.done, spaceId, true);
          const next = done === item.done ? item : { ...item, done };
          if (next !== item) patchIn(spaceId, next);
          ready.push({ entry, item: next });
        }
        // 지금 폰에 없는 항목(공간 캐시가 지워짐 등)은 올릴 수 없다
        outbox.settle(missing);

        if (ready.length > 0) {
          let accepted = true;
          try {
            await remote.upsertItems(
              ready.map((r) => r.item),
              spaceId
            );
          } catch (e) {
            if (isNetworkError(e)) throw e;
            console.warn('[outbox] upsert rejected', e);
            accepted = false;
          }
          outbox.settle(ready.map((r) => r.entry));
          if (accepted) {
            const ids = ready
              .filter((r) => r.entry.notify === 'added')
              .map((r) => r.item.id);
            if (ids.length > 0) notifySpace(spaceId, 'added', ids);
          }
        }

        // 내 평가 (항목이 먼저 서버에 있어야 해서 맨 뒤에)
        const userId = useSpaceStore.getState().userId;
        if (!userId) return;
        for (const entry of reviews) {
          const item = findIn(spaceId, entry.itemId);
          if (!item) {
            outbox.settle([entry]);
            continue;
          }
          const mine = myReview(item, userId);
          try {
            if (mine) {
              await remote.upsertReview(item.id, spaceId, userId, mine);
            } else {
              await remote.deleteReview(item.id, userId);
            }
          } catch (e) {
            if (isNetworkError(e)) throw e;
            console.warn('[outbox] review rejected', e);
            outbox.settle([entry]);
            continue;
          }
          outbox.settle([entry]);
          // 별점을 남겼을 때만 알린다 (건너뛰기는 조용히)
          if (entry.notify && entry.notify !== 'added' && mine?.rating) {
            notifySpace(spaceId, entry.notify, [item.id]);
          }
        }
      };

      /** 공간 항목의 내 평가를 바꾸고(null이면 지우기) 서버와 맞추라고 적어둔다 */
      const setMine = (
        id: string,
        review: Pick<ItemReview, 'rating' | 'review'> | null,
        notify?: 'done' | 'reviewed'
      ) => {
        const { spaceId } = get();
        const userId = useSpaceStore.getState().userId;
        if (!spaceId || !userId) return;
        const target = findItem(id);
        if (!target) return;
        const others = (target.reviews ?? []).filter(
          (r) => r.userId !== userId
        );
        const reviews = review
          ? [
              ...others,
              {
                userId,
                rating: review.rating,
                review: review.review,
                updatedAt: new Date().toISOString(),
              },
            ]
          : others;
        replaceItem(id, { ...target, reviews });
        useOutboxStore.getState().queueReview(spaceId, id, notify);
        flushSoon();
      };

      const runFlush = async () => {
        const outbox = useOutboxStore.getState();
        const bySpace = new Map<string, OutboxEntry[]>();
        for (const e of Object.values(outbox.entries)) {
          bySpace.set(e.spaceId, [...(bySpace.get(e.spaceId) ?? []), e]);
        }
        try {
          for (const [spaceId, entries] of bySpace) {
            await flushSpace(spaceId, entries);
          }
          const paths = useOutboxStore.getState().photoPaths;
          for (const path of paths) {
            try {
              await remote.removePhoto(path);
            } catch (e) {
              if (isNetworkError(e)) throw e;
              // 이미 없거나 지울 권한이 없는 사진은 붙잡고 있지 않는다
            }
            useOutboxStore.getState().settlePhotos([path]);
          }
        } catch (e) {
          noteFailure(e);
          return false;
        }
        if (bySpace.size > 0) useConnectionStore.getState().markOnline();
        // 인터넷 문제 없이 끝났다
        return true;
      };

      return {
        spaceId: null,
        items: [],
        cache: {},
        sync: { status: 'idle', error: null },

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
          // 저장되면 같은 공간 사람들에게 알린다
          pushItems(created, 'added');
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
          const { spaceId } = get();
          for (const t of targets) deleteRecordPhotos(t.done, spaceId);
          set({ items: get().items.filter((it) => !idSet.has(it.id)) });

          if (!spaceId) return;
          useOutboxStore.getState().queueDelete(spaceId, ids);
          flushSoon();
        },

        recordDone: async (id, record) => {
          const target = findItem(id);
          if (!target) return;
          const prev = target.done;
          const { spaceId } = get();

          // 공간이면 새로 고른 사진(서버 경로가 아직 없음)을 먼저 올려본다.
          // 오프라인이라 못 올린 사진은 폰 파일로 남겨두고, 다시 연결되면 대기열이 올린다
          const next: DoneRecord =
            spaceId && useConnectionStore.getState().online
              ? ((await withUploadedPhoto(record, spaceId)) ?? record)
              : record;

          // 빠진 예전 사진 정리
          const nextPhotos = recordPhotos(next);
          const keptUris = new Set(nextPhotos.map((p) => p.uri));
          const keptPaths = new Set(nextPhotos.map((p) => p.path));
          const removedPaths: string[] = [];
          for (const photo of recordPhotos(prev)) {
            if (photo.uri && !keptUris.has(photo.uri)) deletePhoto(photo.uri);
            if (photo.path && !keptPaths.has(photo.path)) {
              removedPaths.push(photo.path);
            }
          }
          if (spaceId) {
            useOutboxStore.getState().queuePhotoRemoval(removedPaths);
          }

          const item = { ...target, done: next };
          replaceItem(id, item);
          pushItems([item]);
          if (spaceId) {
            // 별점·소감은 내 평가로. 처음 남긴 기록이면 'done', 남이 남긴 기록에 더하면 'reviewed' 알림
            const hadMine = Boolean(
              myReview(target, useSpaceStore.getState().userId)
            );
            setMine(
              id,
              { rating: record.rating, review: record.review },
              !prev ? 'done' : hadMine ? undefined : 'reviewed'
            );
          }
        },

        saveMyReview: (id, review) => {
          const target = findItem(id);
          if (!target?.done) return;
          const hadMine = Boolean(
            myReview(target, useSpaceStore.getState().userId)
          );
          setMine(id, review, hadMine ? undefined : 'reviewed');
        },

        clearDone: (id) => get().clearDoneMany([id]),

        clearDoneMany: (ids) => {
          const idSet = new Set(ids);
          const cleared: BucketItem[] = [];
          const { spaceId } = get();
          const userId = useSpaceStore.getState().userId;
          const onlyMine: string[] = [];
          set({
            items: get().items.map((it) => {
              if (!idSet.has(it.id) || !it.done) return it;
              // 공간에서 다른 사람 평가가 남아 있으면 내 평가만 지운다 (기록은 그대로)
              const othersLeft = (it.reviews ?? []).some(
                (r) => r.userId !== userId
              );
              if (spaceId && othersLeft) {
                onlyMine.push(it.id);
                return it;
              }
              deleteRecordPhotos(it.done, spaceId);
              const next = { ...it, done: null };
              cleared.push(next);
              return next;
            }),
          });
          pushItems(cleared);
          if (spaceId) {
            for (const id of [...onlyMine, ...cleared.map((it) => it.id)]) {
              setMine(id, null);
            }
          }
        },

        addItemsTo: async (target, inputs) => {
          if (target === get().spaceId) {
            get().addItems(inputs);
            return;
          }
          const now = dayjs();
          const created: BucketItem[] = inputs.map((input, i) => ({
            ...input,
            id: remote.newItemId(),
            createdAt: now.subtract(i, 'millisecond').toISOString(),
            done: null,
          }));
          if (target) {
            await remote.upsertItems(created, target);
            notifySpace(
              target,
              'added',
              created.map((it) => it.id)
            );
          }
          // 그 공간으로 바꾸면 바로 보이게 저장해 둔 목록에도 넣는다
          const key = cacheKey(target);
          const { cache } = get();
          set({
            cache: { ...cache, [key]: [...created, ...(cache[key] ?? [])] },
          });
        },

        switchSpace: async (spaceId) => {
          const { spaceId: current, items, cache } = get();
          if (current !== spaceId) {
            set({
              spaceId,
              items: cache[cacheKey(spaceId)] ?? [],
              cache: { ...cache, [cacheKey(current)]: items },
              sync: { status: 'idle', error: null },
            });
          }
          if (spaceId) await get().pull();
        },

        resetAll: () => {
          const { items, cache } = get();
          for (const it of [...items, ...Object.values(cache).flat()]) {
            for (const photo of recordPhotos(it.done)) deletePhoto(photo.uri);
          }
          set({ spaceId: null, items: [], cache: {} });
          useOutboxStore.getState().clear();
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
          // 해낸 기록의 별점·소감은 공간에서 내 평가가 된다
          const userId = useSpaceStore.getState().userId;
          if (userId) {
            for (const it of uploaded) {
              if (!it.done) continue;
              await remote.upsertReview(it.id, spaceId, userId, {
                rating: it.done.rating,
                review: it.done.review,
              });
            }
          }

          // 옮긴 뒤 '나만 보기'는 비운다
          set({
            items: current === null ? [] : get().items,
            cache: { ...get().cache, [LOCAL_KEY]: [] },
          });
        },

        pull: async () => {
          const { spaceId } = get();
          if (!spaceId) return;
          set({ sync: { status: 'loading', error: null } });
          // 오프라인 때 바꾼 내용을 먼저 올린다 (못 올려도 아래에서 지켜준다)
          await get().flushPending();
          let rows: remote.ItemRowWithReviews[];
          try {
            rows = await remote.fetchItems(spaceId);
          } catch (e) {
            noteFailure(e);
            if (get().spaceId === spaceId) {
              set({ sync: { status: 'error', error: e } });
            }
            throw e;
          }
          useConnectionStore.getState().markOnline();
          // 받는 사이에 다른 공간으로 바꿨으면 버린다
          if (get().spaceId !== spaceId) return;
          set({ sync: { status: 'idle', error: null } });

          // 아직 안 올라간 변경은 서버 목록보다 폰 내용을 믿는다
          const { upserts, deletes, reviews } = pendingFor(spaceId);
          const local = get().items;
          const localById = new Map(local.map((it) => [it.id, it]));
          const merged = rows
            .filter((r) => !deletes.has(r.id))
            .map((r) => {
              const mine = localById.get(r.id);
              if (upserts.has(r.id) && mine) return mine;
              const next = remote.fromRow(r, mine);
              // 내 평가가 아직 안 올라갔으면 평가 목록은 폰 것을 쓴다
              return reviews.has(r.id) && mine
                ? { ...next, reviews: mine.reviews }
                : next;
            });
          const onServer = new Set(rows.map((r) => r.id));
          const notYetUp = local.filter(
            (it) => upserts.has(it.id) && !onServer.has(it.id)
          );
          set({
            items: [...notYetUp, ...merged].sort(
              (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
            ),
          });
        },

        flushPending: () => {
          if (flushing) {
            // 올리는 사이에 새로 바뀐 게 있으면 끝나고 한 번 더 올린다
            flushAgain = true;
            return flushing;
          }
          flushing = (async () => {
            let ok = await runFlush();
            while (ok && flushAgain) {
              flushAgain = false;
              ok = await runFlush();
            }
            flushAgain = false;
            const left = useOutboxStore.getState();
            return (
              ok &&
              Object.keys(left.entries).length === 0 &&
              left.photoPaths.length === 0
            );
          })().finally(() => {
            flushing = null;
          });
          return flushing;
        },

        applyRemoteRow: (row) => {
          if (row.space_id !== get().spaceId) return;
          // 폰에서 바꾸고 아직 안 올라간 항목은 폰 내용을 유지한다
          if (pendingFor(row.space_id).upserts.has(row.id)) return;
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

        applyRemoteReview: (row) => {
          const { spaceId } = get();
          if (row.space_id !== spaceId) return;
          // 내가 바꾸고 아직 안 올라간 평가는 폰 것을 유지한다
          const me = useSpaceStore.getState().userId;
          if (
            row.user_id === me &&
            pendingFor(spaceId).reviews.has(row.item_id)
          ) {
            return;
          }
          const target = findItem(row.item_id);
          if (!target) return;
          const review = remote.reviewFromRow(row);
          replaceItem(row.item_id, {
            ...target,
            reviews: [
              ...(target.reviews ?? []).filter((r) => r.userId !== row.user_id),
              review,
            ],
          });
        },

        applyRemoteReviewDelete: (old) => {
          const { spaceId } = get();
          if (!old.item_id || !old.user_id || !spaceId) return;
          const me = useSpaceStore.getState().userId;
          if (
            old.user_id === me &&
            pendingFor(spaceId).reviews.has(old.item_id)
          ) {
            return;
          }
          const target = findItem(old.item_id);
          if (!target) return;
          replaceItem(old.item_id, {
            ...target,
            reviews: (target.reviews ?? []).filter(
              (r) => r.userId !== old.user_id
            ),
          });
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
          // v1 → v2: 장소만 있던 데이터를 '가보기'로, visit → done
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
          done: it.done
            ? { ...it.done, photoPath: null, photos: undefined }
            : null,
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
