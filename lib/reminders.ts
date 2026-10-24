/**
 * 폰 안에서 예약하는 알림 (서버 없이, 새 빌드 없이 동작한다).
 * - 목표 날짜: 항목마다 고른 시점(일주일 전 오전 10시, 하루 전 오후 8시, 당일 오전 9시)
 * - 주말 추천: 다가오는 금요일 오후 7시에 버킷리스트에서 하나 추천 (설정에서 끌 수 있다)
 *
 * 항목이 바뀔 때마다 우리 예약(goal:·weekend:)을 모두 지우고 새로 건다.
 * 정확한 시각 권한(SCHEDULE_EXACT_ALARM) 없이 걸어서 몇 분 늦게 울릴 수 있다.
 */
import dayjs from 'dayjs';
import { Platform } from 'react-native';

import {
  GOAL_REMIND_META,
  type BucketItem,
  type GoalRemind,
} from '@/lib/bucket/types';
import {
  isPushSupported,
  loadNotifications,
  setupNotificationHandler,
} from '@/lib/push';
import type { LocalInboxEntry } from '@/store/useLocalInboxStore';

/** 한 번에 걸어 두는 예약 수 (안드로이드 한도보다 넉넉히 적게) */
const MAX_SCHEDULED = 60;
/** 이보다 먼 목표 알림은 아직 걸지 않는다 (앱을 열 때마다 다시 건다) */
const HORIZON_DAYS = 120;
/** 주말 추천을 몇 주치 걸어 둘지 */
const WEEKEND_WEEKS = 4;
const CHANNEL_ID = 'reminders';
const OUR_PREFIXES = ['goal:', 'weekend:'];

export type ReminderSource = {
  /** null이면 '나만 보기' */
  spaceId: string | null;
  /** 알림 제목에 쓸 공간 이름 (예: ✨ 우리의 버킷리스트) */
  title: string;
  items: BucketItem[];
};

function shortTitle(title: string) {
  return title.length > 20 ? `${title.slice(0, 20)}…` : title;
}

function goalMessage(remind: GoalRemind, title: string) {
  const t = `'${shortTitle(title)}'`;
  if (remind === 'week') return `${t} 목표 날짜까지 일주일 남았어요`;
  if (remind === 'day') return `내일이 ${t} 목표 날이에요`;
  return `오늘이 ${t} 목표 날이에요!`;
}

/** 날짜로 정해지는 숫자 (같은 금요일엔 같은 추천이 나오게) */
function seedOf(key: string) {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** 지금 걸어야 할 예약 목록 */
export function planReminders(
  sources: ReminderSource[],
  options: { weekend: boolean; now?: number }
): LocalInboxEntry[] {
  const now = options.now ?? Date.now();
  const horizon = now + HORIZON_DAYS * 24 * 60 * 60 * 1000;
  const plan: LocalInboxEntry[] = [];

  for (const source of sources) {
    for (const item of source.items) {
      if (!item.goal || item.done) continue;
      for (const remind of item.goal.remind) {
        const meta = GOAL_REMIND_META[remind];
        const at = dayjs(item.goal.date)
          .subtract(meta.daysBefore, 'day')
          .hour(meta.hour)
          .minute(0)
          .second(0)
          .valueOf();
        if (at <= now || at > horizon) continue;
        plan.push({
          id: `goal:${item.id}:${remind}`,
          kind: 'goal',
          at,
          title: source.title,
          body: goalMessage(remind, item.title),
          spaceId: source.spaceId,
          itemId: item.id,
        });
      }
    }
  }

  if (options.weekend) {
    // 추천 후보: 아직 안 한 항목 전부 (공간 구분 없이)
    const candidates = sources.flatMap((s) =>
      s.items.filter((it) => !it.done).map((it) => ({ source: s, item: it }))
    );
    let friday = dayjs(now).day(5).hour(19).minute(0).second(0);
    if (friday.valueOf() <= now) friday = friday.add(1, 'week');
    for (let i = 0; i < WEEKEND_WEEKS; i++) {
      const date = friday.add(i, 'week');
      const key = date.format('YYYY-MM-DD');
      const pick =
        candidates.length > 0
          ? candidates[seedOf(key) % candidates.length]
          : null;
      plan.push({
        id: `weekend:${key}`,
        kind: 'weekend',
        at: date.valueOf(),
        title: '이번 주말 뭐 할까?',
        body: pick
          ? `'${shortTitle(pick.item.title)}' 어때요? ${pick.source.title}`
          : '버킷리스트에 하고 싶은 걸 담아봐요',
        spaceId: pick ? pick.source.spaceId : null,
        itemId: pick ? pick.item.id : null,
      });
    }
  }

  return plan.sort((a, b) => a.at - b.at).slice(0, MAX_SCHEDULED);
}

/** 알림 권한이 있는지 (ask면 없을 때 물어본다) */
export async function ensureReminderPermission(ask: boolean) {
  if (!isPushSupported()) return false;
  const Notifications = await loadNotifications();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!ask || !current.canAskAgain) return false;
  await setupNotificationHandler();
  await ensureChannel();
  return (await Notifications.requestPermissionsAsync()).granted;
}

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  const Notifications = await loadNotifications();
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: '목표 날짜·주말 추천',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * 예약을 계획대로 다시 건다. 권한이 없으면 아무것도 걸지 않고 false.
 * 건 예약 목록(알림센터용)을 돌려준다.
 */
export async function applyReminders(
  plan: LocalInboxEntry[]
): Promise<LocalInboxEntry[] | null> {
  if (!isPushSupported()) return null;
  const Notifications = await loadNotifications();
  const { granted } = await Notifications.getPermissionsAsync();
  await setupNotificationHandler();

  // 우리 예약만 지운다 (다른 알림은 건드리지 않는다)
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const req of scheduled) {
    const id = (req as { identifier?: string }).identifier ?? '';
    if (OUR_PREFIXES.some((p) => id.startsWith(p))) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
  }
  if (!granted || plan.length === 0) return granted ? [] : null;

  await ensureChannel();
  const placed: LocalInboxEntry[] = [];
  for (const entry of plan) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: entry.id,
        content: {
          title: entry.title,
          body: entry.body,
          data: {
            spaceId: entry.spaceId,
            itemId: entry.itemId,
            kind: entry.kind,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(entry.at),
          channelId: CHANNEL_ID,
        },
      });
      placed.push(entry);
    } catch (e) {
      console.warn('[reminders] schedule failed', e);
    }
  }
  return placed;
}
