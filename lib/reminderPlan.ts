/**
 * 폰 안 알림 예약 계획 (어떤 알림을 언제 걸지). 알림 모듈 없이 계산만 해서 테스트할 수 있다.
 */
import dayjs from 'dayjs';

import {
  GOAL_REMIND_META,
  type BucketItem,
  type GoalRemind,
} from '@/lib/bucket/types';
import type { LocalInboxEntry } from '@/store/useLocalInboxStore';

/** 한 번에 걸어 두는 예약 수 (안드로이드 한도보다 넉넉히 적게) */
const MAX_SCHEDULED = 60;
/** 이보다 먼 목표 알림은 아직 걸지 않는다 (앱을 열 때마다 다시 건다) */
const HORIZON_DAYS = 120;
/** 주말 추천을 몇 주치 걸어 둘지 */
const WEEKEND_WEEKS = 4;

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
