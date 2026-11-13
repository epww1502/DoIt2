/**
 * 정한 날 날씨 예보 (Open-Meteo: 키 없이 쓰는 무료 예보, 오늘부터 16일까지).
 * 보내는 것은 장소 좌표(소수 둘째 자리로 줄여서)와 날짜뿐이다.
 */
import dayjs from 'dayjs';

import { describe } from '@/lib/weather';

/** 예보가 있는 날 수 (오늘 포함) */
export const FORECAST_DAYS = 16;

export type DayWeather = {
  /** YYYY-MM-DD */
  date: string;
  emoji: string;
  label: string;
  max: number;
  min: number;
  /** 비·눈 올 확률 % (없으면 null) */
  rain: number | null;
};

/** 이 기간(첫날~마지막 날)에 예보를 볼 수 있는지 (하루라도 예보 범위 안이면) */
export function forecastRange(
  start: string,
  end: string,
  today: string
): { from: string; to: string } | null {
  const last = dayjs(today)
    .add(FORECAST_DAYS - 1, 'day')
    .format('YYYY-MM-DD');
  const from = start < today ? today : start;
  const to = end > last ? last : end;
  return from <= to ? { from, to } : null;
}

type ForecastResponse = {
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: (number | null)[];
  };
};

/** 예보 응답 → 날마다 날씨 */
export function parseForecast(json: ForecastResponse): DayWeather[] {
  const d = json.daily;
  if (!d?.time) return [];
  return d.time.map((date, i) => {
    const { emoji, summary: label } = describe(d.weather_code?.[i] ?? -1);
    const rain = d.precipitation_probability_max?.[i];
    return {
      date,
      emoji,
      label,
      max: Math.round(d.temperature_2m_max?.[i] ?? 0),
      min: Math.round(d.temperature_2m_min?.[i] ?? 0),
      rain: typeof rain === 'number' ? rain : null,
    };
  });
}

const cache = new Map<string, { at: number; days: DayWeather[] }>();
/** 같은 곳·같은 날 예보는 30분 동안 다시 받지 않는다 */
const CACHE_MS = 30 * 60 * 1000;

/** 그 곳의 날마다 예보. 못 받으면 throw */
export async function fetchForecast(
  latitude: number,
  longitude: number,
  from: string,
  to: string
): Promise<DayWeather[]> {
  const lat = latitude.toFixed(2);
  const lng = longitude.toFixed(2);
  const key = `${lat},${lng},${from},${to}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.days;
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lng,
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
    start_date: from,
    end_date: to,
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`weather ${res.status}`);
  const days = parseForecast((await res.json()) as ForecastResponse);
  cache.set(key, { at: Date.now(), days });
  return days;
}
