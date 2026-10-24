/**
 * 폰 안에서 예약한 알림(목표 날짜·주말 추천) 기록.
 * 예약할 때 같이 적어 두고, 시간이 지난 것만 알림센터에 보여준다.
 * (예약 알림은 울린 뒤에 앱이 알 수 없어서, 예약한 시각으로 판단한다)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type LocalInboxEntry = {
  /** 예약 알림 id (goal:항목:시점, weekend:날짜) */
  id: string;
  kind: 'goal' | 'weekend';
  /** 울리는 시각 (ms) */
  at: number;
  title: string;
  body: string;
  spaceId: string | null;
  itemId: string | null;
};

type LocalInboxState = {
  entries: LocalInboxEntry[];
  /** '모두 읽음'을 누른 시각 (그 뒤에 울린 것이 '안 읽음') */
  seenAt: number;
  /** 하나씩 눌러서 읽은 알림 id */
  readIds: string[];
  /** 앞으로 울릴 예약을 새 목록으로 바꾼다 (이미 울린 기록은 남긴다) */
  replaceUpcoming: (upcoming: LocalInboxEntry[]) => void;
  /** 모두 읽음 */
  markSeen: () => void;
  /** 하나 읽음 */
  markRead: (id: string) => void;
  clear: () => void;
};

/** 알림센터에 남겨 두는 기간 */
const KEEP_MS = 30 * 24 * 60 * 60 * 1000;

export const useLocalInboxStore = create<LocalInboxState>()(
  persist(
    (set, get) => ({
      entries: [],
      seenAt: 0,
      readIds: [],
      replaceUpcoming: (upcoming) => {
        const now = Date.now();
        const past = get().entries.filter(
          (e) => e.at <= now && now - e.at < KEEP_MS
        );
        set({ entries: [...past, ...upcoming] });
      },
      markSeen: () => set({ seenAt: Date.now(), readIds: [] }),
      markRead: (id) => {
        if (get().readIds.includes(id)) return;
        // 오래된 id는 버려서 계속 쌓이지 않게
        set({ readIds: [...get().readIds, id].slice(-200) });
      },
      clear: () => set({ entries: [], seenAt: 0, readIds: [] }),
    }),
    {
      name: 'doit2-local-inbox',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

/** 이미 울린(시각이 지난) 폰 안 알림들, 최근 순 */
export function firedLocalEntries(entries: LocalInboxEntry[], now: number) {
  return entries
    .filter((e) => e.at <= now && now - e.at < KEEP_MS)
    .sort((a, b) => b.at - a.at);
}
