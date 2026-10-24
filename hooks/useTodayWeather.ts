import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { fetchTodayWeather, type TodayWeather } from '@/lib/weather';

/** 이 시간 안에 잡힌 위치면 다시 찾지 않고 쓴다 */
const LAST_POSITION_MAX_AGE_MS = 30 * 60 * 1000;
/** 앱으로 돌아왔을 때 날씨를 받은 지 이만큼 지났으면 새로 받는다 */
const WEATHER_STALE_MS = 30 * 60 * 1000;
/** 위치 찾기·날씨 받기가 이보다 오래 걸리면 실패로 본다 ('확인하고 있어요'에 멈춰 있지 않게) */
const WEATHER_TIMEOUT_MS = 15000;

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    ),
  ]);
}

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

    // 권한을 묻는 동안은 기다리고, 그 뒤 위치·날씨는 시간을 정해둔다
    const weather = await withTimeout(
      (async () => {
        const position =
          (await Location.getLastKnownPositionAsync({
            maxAge: LAST_POSITION_MAX_AGE_MS,
          })) ??
          // 날씨용이라 대략적인 위치면 충분하다
          (await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low,
          }));
        return fetchTodayWeather(
          position.coords.latitude,
          position.coords.longitude
        );
      })(),
      WEATHER_TIMEOUT_MS
    );
    return { status: 'ready', weather };
  } catch {
    return { status: 'error' };
  }
}

/**
 * 지금 위치의 오늘 날씨. 위치 권한이 없으면 'denied'.
 * 화면이 처음 열릴 때 받고, 앱으로 돌아왔을 때 30분이 지났거나
 * 지난번에 못 받았으면(권한 거부·오류) 다시 받는다.
 */
export function useTodayWeather() {
  const [state, setState] = useState<WeatherState>({ status: 'loading' });
  /** 마지막으로 날씨를 받은(받으려 한) 시각 */
  const loadedAt = useRef(0);
  // 앱 복귀 이벤트에서 지금 상태를 보려고 따로 들고 있는다
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  /**
   * 날씨를 받아서 바꾼다 (받는 동안은 지금 보이는 날씨를 그대로 둔다).
   * 이미 날씨가 보이는데 이번에 실패하면 예전 날씨를 그대로 둔다.
   */
  const fetchAndApply = useCallback(async () => {
    loadedAt.current = Date.now();
    const next = await loadWeather();
    if (next.status === 'error' && stateRef.current.status === 'ready') return;
    setState(next);
  }, []);

  useEffect(() => {
    void fetchAndApply();

    const sub = AppState.addEventListener('change', (appState) => {
      if (appState !== 'active') return;
      const failed =
        stateRef.current.status === 'denied' ||
        stateRef.current.status === 'error';
      const stale = Date.now() - loadedAt.current > WEATHER_STALE_MS;
      if (failed || stale) void fetchAndApply();
    });
    return () => sub.remove();
  }, [fetchAndApply]);

  // '다시 시도' 버튼: 불러오는 중으로 바꾸고 다시 받는다
  const reload = useCallback(() => {
    setState({ status: 'loading' });
    void fetchAndApply();
  }, [fetchAndApply]);

  return { state, reload };
}
