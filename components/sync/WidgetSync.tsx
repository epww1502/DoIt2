import dayjs from 'dayjs';
import { requireOptionalNativeModule } from 'expo';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { todayKey } from '@/lib/date';
import {
  ddayProps,
  memoryProps,
  nextProps,
  pickProps,
  widgetDays,
} from '@/lib/widgets/data';
import { useBucketStore, useBucketStoreHydrated } from '@/store/useBucketStore';

/** 담은 것이 연달아 바뀔 때 위젯을 한 번만 고치려고 기다리는 시간 */
const WAIT_MS = 1500;

/** 이 빌드에 위젯 모듈이 있는지 (지금은 아이폰만) */
function widgetsAvailable() {
  return (
    Platform.OS === 'ios' && requireOptionalNativeModule('ExpoWidgets') !== null
  );
}

/**
 * 화면 없이, 지금 보고 있는 목록으로 홈 화면 위젯의 내용을 고쳐 두는 컴포넌트 (루트 레이아웃에 한 번, 새 빌드부터).
 * - 추억·D-day는 날짜가 바뀌면 내용이 달라져서 며칠 치를 미리 넘긴다 (앱을 안 켜도 맞게 보이게)
 * - 뽑기 후보는 안 한 것이 달라졌을 때만 다시 섞는다 (그대로면 위젯에서 넘겨 본 자리를 지킨다)
 */
export function WidgetSync() {
  const hydrated = useBucketStoreHydrated();
  const items = useBucketStore((s) => s.items);
  /** 마지막으로 뽑기 후보를 넘겼을 때의 '안 한 것' 목록 */
  const pickKey = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated || !widgetsAvailable()) return;

    const sync = () => {
      try {
        // 위젯 모듈이 없는 빌드에서 불러오지 않게, 쓸 때만 불러온다
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const widgets = require('@/widgets') as typeof import('@/widgets');
        const today = todayKey();
        const days = widgetDays(today);
        const at = (day: string) => dayjs(day).startOf('day').toDate();

        widgets.memoryWidget.updateTimeline(
          days.map((day) => ({ date: at(day), props: memoryProps(items, day) }))
        );
        widgets.ddayWidget.updateTimeline(
          days.map((day) => ({ date: at(day), props: ddayProps(items, day) }))
        );
        widgets.nextWidget.updateSnapshot(nextProps(items, today));

        const key = items
          .filter((it) => !it.done)
          .map((it) => it.id)
          .sort()
          .join(',');
        if (key !== pickKey.current) {
          pickKey.current = key;
          widgets.pickWidget.updateSnapshot(pickProps(items, today));
        }
      } catch {
        // 위젯은 없어도 되는 기능이라 실패해도 그냥 둔다
      }
    };

    const timer = setTimeout(sync, WAIT_MS);
    // 앱으로 돌아오면 날짜가 바뀌었을 수 있어서 다시 맞춘다
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [hydrated, items]);

  return null;
}
