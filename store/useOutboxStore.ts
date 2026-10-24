/**
 * 아직 서버에 올리지 못한 변경 대기열 (오프라인일 때 바꾼 내용을 지킨다).
 * 공간 항목을 바꾸면 먼저 여기에 넣고 바로 올려본다. 올라가면 빠지고, 실패하면 남아서
 * 다시 연결될 때 올린다. 앱을 꺼도 남도록 휴대폰에 저장한다.
 *
 * 항목은 내용 대신 id만 적는다. 올릴 때 그 순간의 최신 내용을 읽어서 올린다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type OutboxOp = 'upsert' | 'delete';

export type OutboxEntry = {
  spaceId: string;
  itemId: string;
  op: OutboxOp;
  /** 올라가면 같은 공간 사람들에게 보낼 알림 */
  notify?: 'added' | 'done';
  /** 올리는 사이에 또 바뀌었는지 알아보는 번호 */
  rev: number;
};

type OutboxState = {
  /** `${spaceId}:${itemId}` → 대기 중인 변경 */
  entries: Record<string, OutboxEntry>;
  /** 서버에서 지워야 할 사진 경로 */
  photoPaths: string[];

  queueUpsert: (
    spaceId: string,
    itemIds: string[],
    notify?: 'added' | 'done'
  ) => void;
  queueDelete: (spaceId: string, itemIds: string[]) => void;
  queuePhotoRemoval: (paths: (string | null | undefined)[]) => void;
  /** 올라간 변경을 뺀다. 그 사이에 또 바뀌었으면(rev가 다르면) 남긴다 */
  settle: (entries: OutboxEntry[]) => void;
  settlePhotos: (paths: string[]) => void;
  /** 더 이상 들어가 있지 않은 공간의 변경은 버린다 */
  dropSpace: (spaceId: string) => void;
  clear: () => void;
};

let nextRev = 1;
const keyOf = (spaceId: string, itemId: string) => `${spaceId}:${itemId}`;

export const useOutboxStore = create<OutboxState>()(
  persist(
    (set, get) => ({
      entries: {},
      photoPaths: [],

      queueUpsert: (spaceId, itemIds, notify) => {
        if (itemIds.length === 0) return;
        const entries = { ...get().entries };
        for (const itemId of itemIds) {
          const key = keyOf(spaceId, itemId);
          const prev = entries[key];
          entries[key] = {
            spaceId,
            itemId,
            op: 'upsert',
            // 처음 담은 알림('added')이 아직 안 나갔으면 그대로 둔다
            notify: prev?.notify ?? notify,
            rev: nextRev++,
          };
        }
        set({ entries });
      },

      queueDelete: (spaceId, itemIds) => {
        if (itemIds.length === 0) return;
        const entries = { ...get().entries };
        for (const itemId of itemIds) {
          entries[keyOf(spaceId, itemId)] = {
            spaceId,
            itemId,
            op: 'delete',
            rev: nextRev++,
          };
        }
        set({ entries });
      },

      queuePhotoRemoval: (paths) => {
        const add = paths.filter((p): p is string => Boolean(p));
        if (add.length === 0) return;
        set({ photoPaths: [...new Set([...get().photoPaths, ...add])] });
      },

      settle: (done) => {
        const entries = { ...get().entries };
        for (const e of done) {
          const key = keyOf(e.spaceId, e.itemId);
          if (entries[key]?.rev === e.rev) delete entries[key];
        }
        set({ entries });
      },

      settlePhotos: (paths) => {
        const gone = new Set(paths);
        set({ photoPaths: get().photoPaths.filter((p) => !gone.has(p)) });
      },

      dropSpace: (spaceId) => {
        const entries = Object.fromEntries(
          Object.entries(get().entries).filter(([, e]) => e.spaceId !== spaceId)
        );
        set({ entries });
      },

      clear: () => set({ entries: {}, photoPaths: [] }),
    }),
    {
      name: 'doit2-outbox',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ entries: s.entries, photoPaths: s.photoPaths }),
      onRehydrateStorage: () => (state) => {
        // 다시 켰을 때 번호가 겹치지 않게 이어서 센다
        const max = Math.max(
          0,
          ...Object.values(state?.entries ?? {}).map((e) => e.rev)
        );
        nextRev = max + 1;
      },
    }
  )
);

/** 이 공간에서 아직 안 올라간 항목 id들 */
export function pendingFor(spaceId: string) {
  const upserts = new Set<string>();
  const deletes = new Set<string>();
  for (const e of Object.values(useOutboxStore.getState().entries)) {
    if (e.spaceId !== spaceId) continue;
    (e.op === 'upsert' ? upserts : deletes).add(e.itemId);
  }
  return { upserts, deletes };
}

/** 아직 안 올라간 변경 개수 (안내 띠에 보여준다) */
export function usePendingCount() {
  return useOutboxStore((s) => Object.keys(s.entries).length);
}
