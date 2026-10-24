import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import {
  applyReminders,
  planReminders,
  type ReminderSource,
} from '@/lib/reminders';
import { LOCAL_KEY, useBucketStore } from '@/store/useBucketStore';
import { useLocalInboxStore } from '@/store/useLocalInboxStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useSpaceStore } from '@/store/useSpaceStore';

/** 항목을 연달아 바꿀 때 매번 다시 걸지 않게 잠깐 기다린다 */
const DEBOUNCE_MS = 1500;

/** 이 폰에 있는 모든 목록 (지금 공간 + 저장해 둔 다른 공간 + 나만 보기) */
function collectSources(): ReminderSource[] {
  const { spaceId, items, cache } = useBucketStore.getState();
  const { spaces, status } = useSpaceStore.getState();
  const lists = new Map<string, typeof items>(Object.entries(cache));
  lists.set(spaceId ?? LOCAL_KEY, items);

  const sources: ReminderSource[] = [];
  for (const [key, list] of lists) {
    if (key === LOCAL_KEY) {
      sources.push({ spaceId: null, title: '📱 나만 보기', items: list });
      continue;
    }
    const space = spaces.find((s) => s.id === key);
    // 나간 공간의 목록은 빼고 (공간 목록을 아직 못 받았으면 일단 넣는다)
    if (!space && status === 'ready') continue;
    sources.push({
      spaceId: key,
      title: space ? `${space.emoji} ${space.name}` : 'DoIt2',
      items: list,
    });
  }
  return sources;
}

/**
 * 화면 없이 폰 안 알림(목표 날짜·주말 추천)을 맞추는 컴포넌트 (루트 레이아웃에 한 번).
 * 항목·설정이 바뀌거나 앱으로 돌아오면 예약을 다시 건다.
 */
export function ReminderSync() {
  const items = useBucketStore((s) => s.items);
  const cache = useBucketStore((s) => s.cache);
  const spaces = useSpaceStore((s) => s.spaces);
  const weekend = useSettingsStore((s) => s.weekendReminder);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const run = () => {
      const plan = planReminders(collectSources(), {
        weekend: useSettingsStore.getState().weekendReminder,
      });
      applyReminders(plan)
        .then((placed) => {
          // 권한이 없으면 알림센터 기록도 그대로 둔다
          if (placed) useLocalInboxStore.getState().replaceUpcoming(placed);
        })
        .catch((e) => console.warn('[reminders] sync failed', e));
    };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(run, DEBOUNCE_MS);

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => {
      sub.remove();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [items, cache, spaces, weekend]);

  return null;
}
