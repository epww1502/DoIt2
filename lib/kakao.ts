/**
 * 카카오 키워드 장소 검색·좌표로 주소 찾기.
 * 카카오 REST API 키가 앱에 남지 않게 Supabase Edge Function(kakao-search)을 거쳐 부른다.
 * 키는 Supabase 대시보드 > Edge Functions > Secrets 의 KAKAO_REST_API_KEY 에 둔다.
 */
import { FunctionsHttpError } from '@supabase/supabase-js';

import type { PlaceInfo } from '@/lib/bucket/types';
import { supabase } from '@/lib/supabase/client';

/** 서버에 카카오 키가 아직 없을 때 */
export class KakaoKeyMissingError extends Error {
  constructor() {
    super('kakao_key_missing');
  }
}

async function callKakao<T>(
  body: Record<string, unknown>,
  signal?: AbortSignal
): Promise<T | null> {
  const { data, error } = await supabase.functions.invoke<T>('kakao-search', {
    body,
    signal,
  });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const res = (await error.context.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (res?.error === 'kakao_key_missing') throw new KakaoKeyMissingError();
    }
    throw error;
  }
  return data;
}

export async function searchKakaoPlaces(
  query: string,
  signal?: AbortSignal
): Promise<PlaceInfo[]> {
  const data = await callKakao<{ places: PlaceInfo[] }>({ query }, signal);
  return data?.places ?? [];
}

/** 좌표 → 주소. 지도에서 직접 찍은 곳에 이름·주소를 붙일 때 쓴다 */
export async function getKakaoAddress(latitude: number, longitude: number) {
  const data = await callKakao<{ address: string; buildingName: string }>({
    action: 'address',
    latitude,
    longitude,
  });
  return {
    address: data?.address ?? '',
    buildingName: data?.buildingName ?? '',
  };
}
