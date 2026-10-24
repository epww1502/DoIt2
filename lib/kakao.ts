/**
 * 카카오 로컬 API: 키워드로 장소 검색
 * https://developers.kakao.com/docs/ko/local/dev-guide
 */
import type { PlaceInfo } from '@/lib/bucket/types';

const KAKAO_REST_API_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? '';

/** 한 번에 받아올 결과 수 (API 최대 15) */
const PAGE_SIZE = 15;

export function hasKakaoKey() {
  return KAKAO_REST_API_KEY.length > 0;
}

type KakaoKeywordDocument = {
  id: string;
  place_name: string;
  category_name: string;
  address_name: string;
  road_address_name: string;
  x: string; // 경도
  y: string; // 위도
  place_url: string;
};

type KakaoKeywordResponse = {
  documents: KakaoKeywordDocument[];
  meta: { is_end: boolean; pageable_count: number; total_count: number };
};

export class KakaoKeyMissingError extends Error {
  constructor() {
    super('EXPO_PUBLIC_KAKAO_REST_API_KEY is not set');
  }
}

/** 카테고리 이름 "음식점 > 양식 > 이탈리안"에서 마지막 부분만 */
function lastCategory(categoryName: string) {
  const parts = categoryName.split('>').map((p) => p.trim());
  return parts[parts.length - 1] ?? '';
}

export async function searchKakaoPlaces(
  query: string,
  signal?: AbortSignal
): Promise<PlaceInfo[]> {
  if (!hasKakaoKey()) throw new KakaoKeyMissingError();

  const params = new URLSearchParams({ query, size: String(PAGE_SIZE) });
  const res = await fetch(
    `https://dapi.kakao.com/v2/local/search/keyword.json?${params}`,
    { headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` }, signal }
  );
  if (!res.ok) throw new Error(`kakao ${res.status}`);
  const data = (await res.json()) as KakaoKeywordResponse;

  return data.documents.map((d) => ({
    kakaoId: d.id,
    name: d.place_name,
    category: lastCategory(d.category_name),
    address: d.road_address_name || d.address_name,
    latitude: Number(d.y),
    longitude: Number(d.x),
  }));
}
