import { useEffect, useState } from 'react';

import { goalEnd } from '@/lib/bucket/calendarEvent';
import type { BucketItem } from '@/lib/bucket/types';
import { todayKey } from '@/lib/date';
import { fetchForecast, forecastRange, type DayWeather } from '@/lib/forecast';

/**
 * 정한 날 날씨 (장소가 있고, 정한 날이 예보 범위 안일 때만).
 * 아직 받는 중이거나 볼 수 없으면 null
 */
export function useGoalWeather(item: BucketItem | undefined) {
  const goal = item?.done ? null : item?.goal;
  const place = item?.place;
  const range =
    goal && place ? forecastRange(goal.date, goalEnd(goal), todayKey()) : null;
  const key =
    range && place
      ? `${place.latitude},${place.longitude},${range.from},${range.to}`
      : null;
  const [result, setResult] = useState<{
    key: string;
    days: DayWeather[];
  } | null>(null);

  useEffect(() => {
    if (!key || !range || !place) return;
    let alive = true;
    fetchForecast(place.latitude, place.longitude, range.from, range.to)
      .then((days) => {
        if (alive) setResult({ key, days });
      })
      // 날씨는 덤이라 못 받으면 그냥 안 보여준다
      .catch(() => {});
    return () => {
      alive = false;
    };
    // key가 장소·기간을 모두 담고 있다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return result && result.key === key ? result.days : null;
}
