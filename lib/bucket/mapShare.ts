import type { PlaceInfo } from './types';

/** 네이버지도·카카오맵 링크 주소들 */
const MAP_HOSTS = [
  'naver.me',
  'map.naver.com',
  'm.map.naver.com',
  'place.naver.com',
  'm.place.naver.com',
  'pcmap.place.naver.com',
  'kko.to',
  'map.kakao.com',
  'm.map.kakao.com',
  'place.map.kakao.com',
];

const URL_PATTERN = /https?:\/\/[^\s<>"']+/i;

/** 공유 글 맨 앞에 붙는 꼬리표: [네이버지도], [네이버 지도], [카카오맵] */
const TAG_PATTERN =
  /\[\s*(네이버\s*지도|카카오\s*맵|naver\s*map|kakao\s*map)\s*\]/gi;

/** 주소가 시작하는 곳 (시·도 이름) */
const REGION_PATTERN =
  /(^|\s)(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도|전북특별자치도|강원특별자치도|제주특별자치도)(특별시|광역시|특별자치시|특별자치도|도)?(\s|$)/;

/** 이름으로 쓰면 안 되는 제목 (지도 앱 이름뿐) */
const GENERIC_TITLES = new Set([
  '네이버 지도',
  '네이버지도',
  '네이버 플레이스',
  '카카오맵',
  '카카오 맵',
  'naver map',
  'kakaomap',
]);

export type MapApp = 'naver' | 'kakao';

export type MapShare = {
  url: string;
  app: MapApp;
  /** 공유 글에 같이 온 장소 이름 */
  name: string | null;
  /** 공유 글에 같이 온 주소 */
  address: string | null;
};

function hostOf(url: string) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** 네이버지도·카카오맵 링크인지 (어느 앱인지) */
export function mapAppOf(url: string): MapApp | null {
  const host = hostOf(url);
  if (!MAP_HOSTS.includes(host)) return null;
  return host.includes('kakao') || host === 'kko.to' ? 'kakao' : 'naver';
}

export const MAP_APP_LABEL: Record<MapApp, string> = {
  naver: '네이버 지도',
  kakao: '카카오맵',
};

/** '이케아 광명점 경기 광명시 일직로 17' → 이름 '이케아 광명점', 주소 '경기 광명시 일직로 17' */
function splitNameAddress(text: string) {
  const m = text.match(REGION_PATTERN);
  if (!m || m.index === undefined) return { name: text, address: null };
  const at = m.index + m[1].length;
  return {
    name: text.slice(0, at).trim(),
    address: text.slice(at).trim() || null,
  };
}

/**
 * 지도 앱에서 '공유'로 복사한 글 → 링크·이름·주소.
 * 예) "[네이버지도]\n이케아 광명점\n경기 광명시 일직로 17\nhttps://naver.me/abc"
 * 지도 링크가 없으면 null. 줄바꿈이 사라진 글(한 줄로 붙여넣음)도 읽는다.
 */
export function parseMapShare(text: string): MapShare | null {
  const url = text.match(URL_PATTERN)?.[0]?.replace(/[)\].,]+$/, '');
  if (!url) return null;
  const app = mapAppOf(url);
  if (!app) return null;

  const rest = text.replace(url, '\n').replace(TAG_PATTERN, '\n');
  const lines = rest
    .split(/\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  let name: string | null = null;
  let address: string | null = null;
  if (lines.length >= 2) {
    name = lines[0];
    address = lines[1];
  } else if (lines.length === 1) {
    ({ name, address } = splitNameAddress(lines[0]));
  }
  // 이름 자리에 주소만 왔으면 이름은 없다
  if (
    name &&
    REGION_PATTERN.test(name) &&
    REGION_PATTERN.exec(name)?.index === 0
  ) {
    address = address ?? name;
    name = null;
  }
  if (name && GENERIC_TITLES.has(name.toLowerCase())) name = null;
  return {
    url,
    app,
    name: name ? name.slice(0, 50) : null,
    address: address ? address.slice(0, 100) : null,
  };
}

/**
 * 링크만 붙여넣었을 때: 열어 본 주소(최종 주소)나 페이지 제목에서 이름을 찾는다.
 * 예) map.naver.com/p/search/이케아/place/123 → '이케아'
 */
export function nameFromPage(
  finalUrl: string | null | undefined,
  title: string | null | undefined
): string | null {
  if (finalUrl) {
    const m = finalUrl.match(/\/search\/([^/?#]+)/);
    if (m) {
      try {
        const q = decodeURIComponent(m[1]).replace(/\+/g, ' ').trim();
        if (q) return q.slice(0, 50);
      } catch {
        // 깨진 주소면 제목으로
      }
    }
  }
  if (!title) return null;
  const cleaned = title
    .replace(
      /\s*[:|\-–]\s*(네이버\s*(지도|플레이스)?|카카오\s*맵|naver|kakao\s*map)\s*$/i,
      ''
    )
    .trim();
  if (!cleaned || GENERIC_TITLES.has(cleaned.toLowerCase())) return null;
  return cleaned.slice(0, 50);
}

/** '경기도 광명시 일직로 17' → '경기 광명 일직로 17' (시·도 꼬리를 떼고 비교) */
function addressKey(address: string) {
  return address
    .replace(/(특별시|광역시|특별자치시|특별자치도|도|시|군|구)(\s|$)/g, '$2')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 검색 결과에서 공유 글의 장소를 고른다.
 * 주소가 있으면 주소가 가장 많이 겹치는 곳, 아니면 이름이 같은 곳, 그것도 없으면 첫 번째.
 */
export function pickSharedPlace(
  places: PlaceInfo[],
  name: string,
  address: string | null
): PlaceInfo | null {
  if (places.length === 0) return null;
  if (address) {
    const want = addressKey(address).split(' ');
    let best: PlaceInfo | null = null;
    let bestScore = 0;
    for (const p of places) {
      const have = addressKey(p.address).split(' ');
      let score = 0;
      for (let i = 0; i < Math.min(want.length, have.length); i++) {
        if (want[i] !== have[i]) break;
        score += 1;
      }
      if (score > bestScore) {
        best = p;
        bestScore = score;
      }
    }
    // 시·도와 시·군·구까지는 맞아야 같은 곳으로 본다
    if (best && bestScore >= 2) return best;
  }
  const same = places.find(
    (p) => p.name.replace(/\s/g, '') === name.replace(/\s/g, '')
  );
  return same ?? places[0];
}
