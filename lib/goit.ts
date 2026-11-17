/**
 * 고잇투(GoIt2, https://go-it-2.vercel.app) 여행 일정 잇기.
 * - 고잇투에서 공유한 일정을 링크로 받아 버킷리스트로 담는다
 * - 장소가 있는 항목으로 고잇투에서 일정을 짜러 간다
 * 서버나 화면에 기대지 않는 계산만 둔다 (Jest로 테스트한다)
 */
import {
  DEFAULT_GOAL_REMIND,
  DEFAULT_SETTING,
  newTodoId,
  type BucketInput,
  type CategoryKey,
  type ItemLink,
  type ItemTodo,
  type PlaceInfo,
} from '@/lib/bucket/types';

export const GOIT_ORIGIN = 'https://go-it-2.vercel.app';
/** 고잇투 일정 가져오기 웹 페이지 (site/goit.html) */
export const GOIT_IMPORT_PAGE = 'https://doit2app.github.io/goit.html';
export const GOIT_SITE_NAME = '고잇투';

const ID = /^[A-Za-z0-9_-]{16,40}$/;
/** 링크 안의 id (?id=… 또는 ?t=…) */
const ID_IN_TEXT = /[?&](?:id|t)=([A-Za-z0-9_-]{16,40})(?![A-Za-z0-9_-])/;

export type GoitStopKind = 'sight' | 'activity' | 'food' | 'cafe';

export type GoitStop = {
  id: string;
  place: PlaceInfo;
  kind: GoitStopKind;
  /** 머무는 시간 (분) */
  stayMin: number;
  /** 고잇투가 고른 이유 한 줄 */
  why: string;
  pinned: boolean;
  blogCount?: number;
  cost?: number;
};

export type GoitTrip = {
  title: string;
  conditions: {
    region: string;
    style: string;
    mode: string;
    notes: string[];
    people?: number;
    /** YYYY-MM-DD */
    startDate?: string;
    lodging?: PlaceInfo;
  };
  days: { stops: GoitStop[] }[];
};

export function isGoitId(value: unknown): value is string {
  return typeof value === 'string' && ID.test(value);
}

/**
 * 붙여넣은 글에서 고잇투 일정 id를 꺼낸다.
 * id만, 고잇투 공유 링크(…/trip/shared?id=), 두잇투 가져오기 페이지(goit.html?t=),
 * 앱 링크(doit2://import/goit?t=) 중 하나면 된다. 링크가 메시지 안에 섞여 있어도 찾는다
 */
export function parseGoitId(text: string | null | undefined): string | null {
  const raw = (text ?? '').trim();
  if (!raw) return null;
  if (ID.test(raw)) return raw;
  const urls = raw.match(/(?:https?|doit2):\/\/[^\s<>"']+/gi) ?? [];
  for (const url of urls) {
    const lower = url.toLowerCase();
    const known =
      lower.startsWith(`${GOIT_ORIGIN}/trip/shared`) ||
      lower.startsWith(GOIT_IMPORT_PAGE) ||
      lower.startsWith('doit2://import/goit');
    if (!known) continue;
    const m = url.match(ID_IN_TEXT);
    if (m) return m[1];
  }
  return null;
}

/** 고잇투 공유 링크 (담은 항목의 참고 링크로 붙인다) */
export function goitShareUrl(id: string) {
  return `${GOIT_ORIGIN}/trip/shared?id=${encodeURIComponent(id)}`;
}

// --- 받은 일정 확인 (다른 서비스에서 온 값이라 모양을 하나하나 본다) ---

const MAX_DAYS = 14;
const MAX_STOPS_PER_DAY = 20;
const KINDS: GoitStopKind[] = ['sight', 'activity', 'food', 'cafe'];

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const text = (v: unknown, max: number) =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

const num = (v: unknown) =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

function isDateKey(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

function toPlace(v: unknown): PlaceInfo | null {
  if (!isObject(v)) return null;
  const name = text(v.name, 60);
  const latitude = num(v.latitude);
  const longitude = num(v.longitude);
  if (!name || latitude === null || longitude === null) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  const kakaoId =
    typeof v.kakaoId === 'string' &&
    /^[A-Za-z0-9_-]{1,40}$/.test(v.kakaoId.trim())
      ? v.kakaoId.trim()
      : null;
  return {
    kakaoId,
    name,
    category: text(v.category, 40),
    address: text(v.address, 120),
    latitude,
    longitude,
  };
}

function toStop(v: unknown, fallbackId: string): GoitStop | null {
  if (!isObject(v)) return null;
  const place = toPlace(v.place);
  if (!place) return null;
  const kind = KINDS.includes(v.kind as GoitStopKind)
    ? (v.kind as GoitStopKind)
    : 'sight';
  const stayMin = num(v.stayMin);
  const blogCount = num(v.blogCount);
  const cost = num(v.cost);
  const id = text(v.id, 60) || fallbackId;
  return {
    id,
    place,
    kind,
    stayMin: stayMin !== null && stayMin > 0 ? Math.round(stayMin) : 60,
    why: text(v.why, 200),
    pinned: v.pinned === true,
    ...(blogCount !== null && blogCount >= 0 ? { blogCount } : {}),
    ...(cost !== null && cost >= 0 ? { cost } : {}),
  };
}

/** 받아 온 JSON을 일정으로. 모양이 맞지 않거나 장소가 하나도 없으면 null */
export function toTrip(value: unknown): GoitTrip | null {
  if (!isObject(value) || !Array.isArray(value.days)) return null;
  const c = isObject(value.conditions) ? value.conditions : {};
  const days = value.days.slice(0, MAX_DAYS).map((day, d) => {
    const stops = isObject(day) && Array.isArray(day.stops) ? day.stops : [];
    return {
      stops: stops
        .slice(0, MAX_STOPS_PER_DAY)
        .map((s, i) => toStop(s, `d${d}s${i}`))
        .filter((s): s is GoitStop => s !== null),
    };
  });
  if (!days.some((d) => d.stops.length > 0)) return null;

  const region = text(c.region, 40);
  const people = num(c.people);
  const lodging = toPlace(c.lodging);
  return {
    title: text(value.title, 80) || (region ? `${region} 여행` : '여행 일정'),
    conditions: {
      region,
      style: text(c.style, 40),
      mode: text(c.mode, 20),
      notes: Array.isArray(c.notes)
        ? c.notes
            .map((n) => text(n, 100))
            .filter(Boolean)
            .slice(0, 10)
        : [],
      ...(people !== null && people >= 1 && people <= 50
        ? { people: Math.round(people) }
        : {}),
      ...(isDateKey(c.startDate) ? { startDate: c.startDate } : {}),
      ...(lodging ? { lodging } : {}),
    },
    days,
  };
}

// --- 날짜 ---

/** 'YYYY-MM-DD'에 며칠 더하기 (달·해가 넘어가도 맞게) */
export function addDays(day: string, n: number) {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + n));
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${date.getUTCFullYear()}-${mm}-${dd}`;
}

/** 여행 날짜 (첫날, 마지막 날). 시작일이 없으면 null */
export function tripDates(trip: GoitTrip) {
  const start = trip.conditions.startDate;
  if (!start) return null;
  return { from: start, to: addDays(start, Math.max(trip.days.length - 1, 0)) };
}

// --- 버킷리스트로 담기 ---

export type GoitImportMode = 'each' | 'trip';

/** 일정 안의 장소 한 곳의 자리 (d일차의 i번째) */
export const stopKey = (day: number, index: number) => `${day}:${index}`;

export type GoitImportOptions = {
  /** 일정 id (참고 링크에 고잇투 공유 링크를 붙인다) */
  id: string;
  /** 담을 장소 (stopKey). 없으면 모두 */
  selected?: ReadonlySet<string>;
};

const CULTURE = /박물관|미술관|전시|공연|박람회|기념관/;

/** 고잇투 장소 종류 → 버킷리스트 카테고리 */
export function stopCategory(stop: Pick<GoitStop, 'kind' | 'place'>) {
  const map: Record<GoitStopKind, CategoryKey> = {
    food: 'food',
    cafe: 'cafe',
    activity: 'activity',
    sight: CULTURE.test(stop.place.category) ? 'culture' : 'trip',
  };
  return map[stop.kind];
}

const cut = (value: string, max: number) =>
  Array.from(value).slice(0, max).join('');

/** 고른 장소만 (일차와 함께) */
function pickedStops(trip: GoitTrip, selected?: ReadonlySet<string>) {
  return trip.days.flatMap((day, d) =>
    day.stops
      .map((stop, i) => ({ stop, day: d, key: stopKey(d, i) }))
      .filter((s) => !selected || selected.has(s.key))
  );
}

/**
 * 받은 일정을 버킷리스트 항목으로.
 * - 'each': 장소마다 하나씩 (시작일이 있으면 그 일차의 날을 목표 날짜로)
 * - 'trip': 여행 하나로, 장소는 할 것 목록에
 */
export function tripToItems(
  trip: GoitTrip,
  mode: GoitImportMode,
  opts: GoitImportOptions
): BucketInput[] {
  const stops = pickedStops(trip, opts.selected);
  if (stops.length === 0) return [];
  const link: ItemLink = {
    url: goitShareUrl(opts.id),
    title: cut(trip.title, 120),
    site: GOIT_SITE_NAME,
  };
  const start = trip.conditions.startDate;

  if (mode === 'each') {
    return stops.map(({ stop, day }) => {
      const category = stopCategory(stop);
      const from = `${GOIT_SITE_NAME} · ${trip.title} ${day + 1}일차`;
      return {
        kind: 'place',
        title: cut(stop.place.name, 40),
        category,
        setting: DEFAULT_SETTING[category],
        location: stop.place.address,
        place: { ...stop.place },
        memo: cut(stop.why ? `${stop.why}\n${from}` : from, 300),
        goal: start
          ? { date: addDays(start, day), remind: [...DEFAULT_GOAL_REMIND] }
          : null,
        todos: [],
        links: [{ ...link }],
      };
    });
  }

  const dates = tripDates(trip);
  const todos: ItemTodo[] = stops.slice(0, 30).map(({ stop, day }) => ({
    id: newTodoId(),
    text: cut(`${day + 1}일차 · ${stop.place.name}`, 60),
    done: false,
    place: { ...stop.place },
  }));
  const first = stops[0].stop.place;
  const memo = [
    `${GOIT_SITE_NAME}에서 짠 ${trip.days.length}일 일정이에요`,
    ...trip.conditions.notes,
  ].join('\n');
  return [
    {
      kind: 'place',
      title: cut(trip.title, 40),
      category: 'trip',
      setting: DEFAULT_SETTING.trip,
      location: first.address,
      place: { ...first },
      memo: cut(memo, 300),
      goal: dates
        ? {
            date: dates.from,
            until: dates.to !== dates.from ? dates.to : null,
            remind: [...DEFAULT_GOAL_REMIND],
          }
        : null,
      todos,
      links: [{ ...link }],
    },
  ];
}

// --- 고잇투에서 일정 짜기 ---

const MAX_MUST = 8;

/** 주소 첫 단어로 '부산 여행' 같은 한 줄 (모르면 '국내 여행') */
function planQuery(address: string | undefined) {
  const first = (address ?? '').trim().split(/\s+/)[0] ?? '';
  const region = first
    .replace(/(특별자치시|특별자치도|특별시|광역시)$/, '')
    .replace(/^(.{2,})도$/, '$1');
  return region ? `${region} 여행` : '국내 여행';
}

/** 고잇투 일정 짜기 화면 주소. 장소 이름은 최대 8곳, 한 곳에 40자까지 */
export function planUrl({
  places,
  date,
}: {
  places: Pick<PlaceInfo, 'name' | 'address'>[];
  date?: string | null;
}) {
  const params: [string, string][] = [['q', planQuery(places[0]?.address)]];
  const names: string[] = [];
  for (const p of places) {
    const name = cut(p.name.trim(), 40);
    if (!name || names.includes(name)) continue;
    names.push(name);
    if (names.length >= MAX_MUST) break;
  }
  for (const name of names) params.push(['must', name]);
  if (date && isDateKey(date)) params.push(['date', date]);
  params.push(['from', 'doit2']);
  return `${GOIT_ORIGIN}/?${params
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&')}`;
}
