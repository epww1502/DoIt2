import { useEffect, useState } from 'react';

import type { NotificationRow } from '@/lib/supabase/database.types';
import { useInboxStore } from '@/store/useInboxStore';
import {
  firedLocalEntries,
  useLocalInboxStore,
  type LocalInboxEntry,
} from '@/store/useLocalInboxStore';

/** 알림센터 한 줄 (서버 소식과 폰 안 알림을 합친 모양) */
export type InboxEntry = {
  id: string;
  kind:
    | 'added'
    | 'done'
    | 'reviewed'
    | 'commented'
    | 'goal'
    | 'weekend'
    | 'photos'
    | 'liked'
    | 'wanted'
    | 'dates';
  at: number;
  title: string;
  body: string;
  spaceId: string | null;
  itemId: string | null;
  unread: boolean;
};

function fromRow(r: NotificationRow): InboxEntry {
  return {
    id: r.id,
    // 사진·하트 알림은 kind를 예전 앱이 아는 값으로 두고 detail에 진짜 종류를 남긴다
    kind: (r.detail ?? r.kind) as InboxEntry['kind'],
    at: Date.parse(r.created_at),
    title: r.title,
    body: r.body,
    spaceId: r.space_id,
    itemId: r.item_id,
    unread: !r.read_at,
  };
}

function fromLocal(
  e: LocalInboxEntry,
  seenAt: number,
  readIds: string[]
): InboxEntry {
  return { ...e, unread: e.at > seenAt && !readIds.includes(e.id) };
}

/** 지금 시각 (1분마다 바뀐다: 예약 알림이 울린 시각이 지나면 목록에 나오게) */
function useNowMinute() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/** 알림센터 목록 (최근 순) */
export function useInboxEntries(): InboxEntry[] {
  const rows = useInboxStore((s) => s.rows);
  const local = useLocalInboxStore((s) => s.entries);
  const seenAt = useLocalInboxStore((s) => s.seenAt);
  const readIds = useLocalInboxStore((s) => s.readIds);
  const now = useNowMinute();
  return [
    ...rows.map(fromRow),
    ...firedLocalEntries(local, now).map((e) => fromLocal(e, seenAt, readIds)),
  ].sort((a, b) => b.at - a.at);
}

/** 알림 하나 읽음 (서버 알림이든 폰 안 알림이든) */
export function markEntryRead(entry: InboxEntry) {
  if (!entry.unread) return;
  if (entry.kind === 'goal' || entry.kind === 'weekend') {
    useLocalInboxStore.getState().markRead(entry.id);
  } else {
    void useInboxStore.getState().markRead(entry.id);
  }
}

/** 모두 읽음 */
export function markAllEntriesRead() {
  void useInboxStore.getState().markAllRead();
  useLocalInboxStore.getState().markSeen();
}

/** 안 읽은 알림 수 (설정 알림센터 칸) */
export function useUnreadCount() {
  return useInboxEntries().filter((e) => e.unread).length;
}
