import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import {
  fetchTodayWeatherMany,
  weatherKey,
  type LatLng,
  type TodayWeather,
} from '@/lib/weather';

/** 이만큼 지난 장소 날씨는 새로 받는다 */
const PLACE_WEATHER_STALE_MS = 30 * 60 * 1000;

/** 장소 날씨 사본 (앱이 켜져 있는 동안 화면끼리 같이 쓴다) */
const cache = new Map<string, { weather: TodayWeather; at: number }>();

/**
 * 여러 장소의 오늘 날씨. 가까운 곳(≈1km)끼리 묶어서 한 번에 물어본다.
 * 위치 권한 없이도 된다 (장소 좌표만 쓴다).
 * 돌려주는 값: weatherKey(좌표) → 그 곳 날씨. 아직 못 받은 곳은 없다.
 */
export function usePlacesWeather(points: LatLng[]) {
  // 같은 동네는 하나로, 순서를 정해서 매번 같은 열쇠 목록이 되게 한다
  const unique = useMemo(() => {
    const byKey = new Map<string, LatLng>();
    for (const p of points) byKey.set(weatherKey(p), p);
    return [...byKey.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [points]);
  const keysSignature = unique.map(([k]) => k).join('|');

  const [byKey, setByKey] = useState<Record<string, TodayWeather>>({});

  useEffect(() => {
    if (unique.length === 0) return;
    let cancelled = false;

    const refresh = async () => {
      const now = Date.now();
      const missing = unique.filter(([key]) => {
        const hit = cache.get(key);
        return !hit || now - hit.at > PLACE_WEATHER_STALE_MS;
      });
      try {
        if (missing.length > 0) {
          const weathers = await fetchTodayWeatherMany(
            missing.map(([, p]) => p)
          );
          missing.forEach(([key], i) => {
            if (weathers[i]) cache.set(key, { weather: weathers[i], at: now });
          });
        }
      } catch {
        // 못 받은 곳은 비워 두면 내 위치 날씨로 대신 판단한다
      }
      if (cancelled) return;
      const next: Record<string, TodayWeather> = {};
      for (const [key] of unique) {
        const hit = cache.get(key);
        if (hit) next[key] = hit.weather;
      }
      setByKey(next);
    };

    void refresh();
    // 앱으로 돌아오면 오래된 장소 날씨만 새로 받는다
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
    // unique는 keysSignature가 같으면 같은 장소들이다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keysSignature]);

  return byKey;
}
