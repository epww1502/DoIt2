/**
 * 폰 안에서 예약하는 알림 (서버 없이, 새 빌드 없이 동작한다).
 * - 목표 날짜: 항목마다 고른 시점(일주일 전 오전 10시, 하루 전 오후 8시, 당일 오전 9시)
 * - 주말 추천: 다가오는 금요일 오후 7시에 버킷리스트에서 하나 추천 (설정에서 끌 수 있다)
 *
 * 항목이 바뀔 때마다 우리 예약(goal:·weekend:)을 모두 지우고 새로 건다.
 * 정확한 시각 권한(SCHEDULE_EXACT_ALARM) 없이 걸어서 몇 분 늦게 울릴 수 있다.
 */
import { Platform } from 'react-native';

import {
  isPushSupported,
  loadNotifications,
  setupNotificationHandler,
} from '@/lib/push';
import type { LocalInboxEntry } from '@/store/useLocalInboxStore';

export { planReminders, type ReminderSource } from './reminderPlan';

const CHANNEL_ID = 'reminders';
const OUR_PREFIXES = ['goal:', 'weekend:'];

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
