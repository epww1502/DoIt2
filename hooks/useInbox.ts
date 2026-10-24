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
  kind: 'added' | 'done' | 'reviewed' | 'goal' | 'weekend';
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
    kind: r.kind as InboxEntry['kind'],
    at: Date.parse(r.created_at),
    title: r.title,
    body: r.body,
    spaceId: r.space_id,
    itemId: r.item_id,
    unread: !r.read_at,
  };
}

function fromLocal(e: LocalInboxEntry, seenAt: number): InboxEntry {
  return { ...e, unread: e.at > seenAt };
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
  const now = useNowMinute();
  return [
    ...rows.map(fromRow),
    ...firedLocalEntries(local, now).map((e) => fromLocal(e, seenAt)),
  ].sort((a, b) => b.at - a.at);
}

/** 안 읽은 알림 수 (종 모양 배지) */
export function useUnreadCount() {
  return useInboxEntries().filter((e) => e.unread).length;
}
