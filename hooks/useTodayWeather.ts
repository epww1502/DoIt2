import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { isNetworkError } from '@/lib/connection';
import { reportError } from '@/lib/errorReport';
import {
  fetchTodayWeather,
  type LatLng,
  type TodayWeather,
} from '@/lib/weather';

/** 이 시간 안에 잡힌 위치면 다시 찾지 않고 쓴다 */
const LAST_POSITION_MAX_AGE_MS = 30 * 60 * 1000;
/** 앱으로 돌아왔을 때 날씨를 받은 지 이만큼 지났으면 새로 받는다 */
const WEATHER_STALE_MS = 30 * 60 * 1000;
/** 위치 찾기가 이보다 오래 걸리면 실패로 본다 ('확인하고 있어요'에 멈춰 있지 않게) */
const LOCATION_TIMEOUT_MS = 10000;
/** 마지막으로 날씨를 본 동네 (이 폰에만 둔다, ≈1km 단위) */
const SAVED_POSITION_KEY = 'doit2-weather-position';

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
  /** reason: 내 위치를 못 찾았는지(location), 날씨를 못 받았는지(weather) */
  | { status: 'error'; reason: 'location' | 'weather' }
  | { status: 'ready'; weather: TodayWeather };

/** 찾은 위치를 동네 단위로 줄여 적어 둔다 (다음에 위치를 못 찾을 때 쓴다) */
function remember(coords: LatLng): LatLng {
  const position = {
    latitude: Number(coords.latitude.toFixed(2)),
    longitude: Number(coords.longitude.toFixed(2)),
  };
  void AsyncStorage.setItem(SAVED_POSITION_KEY, JSON.stringify(position)).catch(
    () => {}
  );
  return position;
}

async function readSavedPosition(): Promise<LatLng | null> {
  try {
    const raw = await AsyncStorage.getItem(SAVED_POSITION_KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<LatLng>) : null;
    return typeof saved?.latitude === 'number' &&
      typeof saved.longitude === 'number'
      ? { latitude: saved.latitude, longitude: saved.longitude }
      : null;
  } catch {
    return null;
  }
}

/**
 * 날씨에 쓸 대략적인 내 위치. 못 찾으면 null.
 * 최근에 잡힌 위치 → 새로 찾기 → 오래됐더라도 폰이 마지막으로 잡은 위치 → 지난번에 날씨를 본 동네 순서로 본다.
 * 실내이거나 위치 서비스가 막 켜진 폰은 새로 찾기가 오래 걸리거나 실패하는데,
 * 날씨는 어제 있던 동네 기준이어도 거의 같아서 오래된 위치라도 쓰는 편이 낫다.
 */
async function findPosition(): Promise<LatLng | null> {
  let failure: unknown;
  try {
    const recent = await Location.getLastKnownPositionAsync({
      maxAge: LAST_POSITION_MAX_AGE_MS,
    });
    if (recent) return remember(recent.coords);
    // 안드로이드의 Low(저전력)는 기지국만 써서 위치가 아예 안 잡히는 폰이 있다. Balanced는 와이파이도 써서 금방 잡힌다
    const current = await withTimeout(
      Location.getCurrentPositionAsync({
        accuracy:
          Platform.OS === 'android'
            ? Location.Accuracy.Balanced
            : Location.Accuracy.Low,
      }),
      LOCATION_TIMEOUT_MS
    );
    return remember(current.coords);
  } catch (e) {
    failure = e;
  }
  const last = await Location.getLastKnownPositionAsync().catch(() => null);
  if (last) return remember(last.coords);
  const saved = await readSavedPosition();
  if (saved) return saved;
  // 대신 쓸 위치도 없어서 화면에 '못 찾았어요'가 뜰 때만 남긴다
  void reportError('alert', failure, '오늘 날씨: 위치 찾기');
  return null;
}

/** 위치 권한 → 현재 위치 → 오늘 날씨 */
async function loadWeather(): Promise<WeatherState> {
  let granted = false;
  try {
    ({ granted } = await Location.requestForegroundPermissionsAsync());
  } catch (e) {
    void reportError('alert', e, '오늘 날씨: 위치 권한');
    return { status: 'error', reason: 'location' };
  }
  if (!granted) return { status: 'denied' };

  const position = await findPosition();
  if (!position) return { status: 'error', reason: 'location' };

  try {
    // 오래 걸리면 fetchTodayWeather가 스스로 끊고 한 번 더 물어본다
    const weather = await fetchTodayWeather(
      position.latitude,
      position.longitude
    );
    return { status: 'ready', weather };
  } catch (e) {
    // 인터넷 문제는 너무 흔하고 앱 잘못이 아니라서 남기지 않는다
    if (!isNetworkError(e))
      void reportError('alert', e, '오늘 날씨: 날씨 받기');
    return { status: 'error', reason: 'weather' };
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
