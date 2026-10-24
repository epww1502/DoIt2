import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

import { fetchTodayWeather, type TodayWeather } from '@/lib/weather';

/** 이 시간 안에 잡힌 위치면 다시 찾지 않고 쓴다 */
const LAST_POSITION_MAX_AGE_MS = 30 * 60 * 1000;

export type WeatherState =
  | { status: 'loading' }
  | { status: 'denied' }
  | { status: 'error' }
  | { status: 'ready'; weather: TodayWeather };

/** 위치 권한 → 현재 위치 → 오늘 날씨 */
async function loadWeather(): Promise<WeatherState> {
  try {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) return { status: 'denied' };

    const position =
      (await Location.getLastKnownPositionAsync({
        maxAge: LAST_POSITION_MAX_AGE_MS,
      })) ??
      // 날씨용이라 대략적인 위치면 충분하다
      (await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      }));

    const weather = await fetchTodayWeather(
      position.coords.latitude,
      position.coords.longitude
    );
    return { status: 'ready', weather };
  } catch {
    return { status: 'error' };
  }
}

/** 지금 위치의 오늘 날씨. 위치 권한이 없으면 'denied' */
export function useTodayWeather() {
  const [state, setState] = useState<WeatherState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    void loadWeather().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const reload = useCallback(async () => {
    setState({ status: 'loading' });
    setState(await loadWeather());
  }, []);

  return { state, reload };
}
