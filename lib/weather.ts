/**
 * 오늘 날씨 (Open-Meteo, API 키 없이 비상업 무료 사용)
 * https://open-meteo.com/en/docs
 */

/** 이 확률(%) 이상이면 비 오는 날로 본다 */
export const RAIN_CHANCE_THRESHOLD = 60;

/** 비·눈·소나기·뇌우를 뜻하는 WMO 날씨 코드 */
const DRIZZLE = [51, 53, 55, 56, 57];
const RAIN = [61, 63, 65, 66, 67];
const SNOW = [71, 73, 75, 77];
const SHOWERS = [80, 81, 82, 85, 86];
const THUNDERSTORM = [95, 96, 97, 99];
const WET_CODES = new Set([
  ...DRIZZLE,
  ...RAIN,
  ...SNOW,
  ...SHOWERS,
  ...THUNDERSTORM,
]);

export type TodayWeather = {
  /** 오늘 최대 강수 확률(%) */
  rainChance: number;
  /** 지금 날씨 코드 (WMO) */
  currentCode: number;
  /** 비 오는 날로 볼지 */
  isRainy: boolean;
  /** 화면에 보여줄 짧은 설명 */
  summary: string;
  emoji: string;
};

function describe(code: number): { summary: string; emoji: string } {
  if (code === 0) return { summary: '맑음', emoji: '☀️' };
  if (code <= 2) return { summary: '구름 조금', emoji: '🌤️' };
  if (code === 3) return { summary: '흐림', emoji: '☁️' };
  if (code === 45 || code === 48) return { summary: '안개', emoji: '🌫️' };
  if (code >= 51 && code <= 57) return { summary: '이슬비', emoji: '🌦️' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82))
    return { summary: '비', emoji: '🌧️' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86)
    return { summary: '눈', emoji: '🌨️' };
  if (code >= 95) return { summary: '뇌우', emoji: '⛈️' };
  return { summary: '알 수 없음', emoji: '🌡️' };
}

type OpenMeteoResponse = {
  current?: { weather_code?: number; precipitation?: number };
  daily?: {
    precipitation_probability_max?: (number | null)[];
    weather_code?: (number | null)[];
  };
};

export type LatLng = { latitude: number; longitude: number };

/**
 * 가까운 곳끼리 묶는 열쇠 (소수 둘째 자리 ≈ 1km).
 * 같은 동네의 장소들은 날씨를 한 번만 물어본다.
 */
export function weatherKey({ latitude, longitude }: LatLng) {
  return `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
}

/** 한 곳의 오늘 날씨 */
export async function fetchTodayWeather(
  latitude: number,
  longitude: number
): Promise<TodayWeather> {
  const [weather] = await fetchTodayWeatherMany([{ latitude, longitude }]);
  return weather;
}

/** 여러 곳의 오늘 날씨를 한 번에 (돌려주는 순서 = 넣은 순서) */
export async function fetchTodayWeatherMany(
  points: LatLng[]
): Promise<TodayWeather[]> {
  if (points.length === 0) return [];
  const params = new URLSearchParams({
    latitude: points.map((p) => p.latitude.toFixed(3)).join(','),
    longitude: points.map((p) => p.longitude.toFixed(3)).join(','),
    current: 'weather_code,precipitation',
    daily: 'precipitation_probability_max,weather_code',
    timezone: 'auto',
    forecast_days: '1',
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`weather ${res.status}`);
  // 한 곳이면 객체, 여러 곳이면 배열로 온다
  const data = (await res.json()) as OpenMeteoResponse | OpenMeteoResponse[];
  return (Array.isArray(data) ? data : [data]).map(toTodayWeather);
}

function toTodayWeather(data: OpenMeteoResponse): TodayWeather {
  const currentCode = data.current?.weather_code ?? 0;
  const currentRain = data.current?.precipitation ?? 0;
  const rainChance = data.daily?.precipitation_probability_max?.[0] ?? 0;
  const dailyCode = data.daily?.weather_code?.[0] ?? currentCode;

  const isRainy =
    rainChance >= RAIN_CHANCE_THRESHOLD ||
    currentRain > 0 ||
    WET_CODES.has(currentCode);

  // 지금 비가 오면 지금 날씨를, 아니면 오늘 하루 날씨를 보여준다
  const { summary, emoji } = describe(
    WET_CODES.has(currentCode) ? currentCode : dailyCode
  );

  return { rainChance, currentCode, isRainy, summary, emoji };
}
