import { Linking } from 'react-native';

import type { PlaceInfo } from '@/lib/bucket/types';

export type MapApp = 'kakao' | 'naver' | 'google';

export const MAP_APPS: { key: MapApp; label: string }[] = [
  { key: 'kakao', label: '카카오맵' },
  { key: 'naver', label: '네이버 지도' },
  { key: 'google', label: '구글 지도' },
];

/** 네이버 지도 앱 링크에 넣는 우리 앱 이름 (app.json 번들 ID) */
const NAVER_APP_NAME = 'com.doit2.app';

type Target =
  | { type: 'place'; place: PlaceInfo }
  /** 카카오에서 고른 장소가 없을 때: 적어 둔 위치 글자로 검색 */
  | { type: 'search'; query: string };

/** [앱 링크, 앱이 없을 때 열 웹 링크] */
function links(app: MapApp, target: Target): [string, string] {
  const enc = encodeURIComponent;

  if (target.type === 'search') {
    const q = enc(target.query);
    switch (app) {
      case 'kakao':
        return [
          `kakaomap://search?q=${q}`,
          `https://map.kakao.com/link/search/${q}`,
        ];
      case 'naver':
        return [
          `nmap://search?query=${q}&appname=${NAVER_APP_NAME}`,
          `https://map.naver.com/p/search/${q}`,
        ];
      case 'google':
        return [
          `https://www.google.com/maps/search/?api=1&query=${q}`,
          `https://www.google.com/maps/search/?api=1&query=${q}`,
        ];
    }
  }

  const { place } = target;
  const { latitude: lat, longitude: lng } = place;
  const name = enc(place.name);
  switch (app) {
    case 'kakao':
      // 카카오 장소면 장소 상세로, 지도에서 직접 찍은 곳이면 그 좌표로 연다
      return place.kakaoId
        ? [
            `kakaomap://place?id=${place.kakaoId}`,
            `https://map.kakao.com/link/map/${place.kakaoId}`,
          ]
        : [
            `kakaomap://look?p=${lat},${lng}`,
            `https://map.kakao.com/link/map/${name},${lat},${lng}`,
          ];
    case 'naver':
      return [
        `nmap://place?lat=${lat}&lng=${lng}&name=${name}&appname=${NAVER_APP_NAME}`,
        `https://map.naver.com/p/search/${name}`,
      ];
    case 'google':
      // 구글 지도는 웹 링크가 앱이 있으면 앱으로 열린다
      return [
        `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
        `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      ];
  }
}

/** 지도 앱으로 연다. 앱이 없으면 웹 지도로 연다. */
export async function openInMap(app: MapApp, target: Target) {
  const [appUrl, webUrl] = links(app, target);
  try {
    await Linking.openURL(appUrl);
  } catch {
    await Linking.openURL(webUrl);
  }
}

/**
 * 안드로이드: 폰에 깔린 지도 앱 중에서 고르는 시스템 선택 창으로 연다 (geo: 링크).
 * 여는 앱이 없으면 구글 웹 지도로 연다.
 */
export async function openInSystemMap(place: PlaceInfo) {
  const { latitude: lat, longitude: lng } = place;
  const label = encodeURIComponent(place.name);
  try {
    await Linking.openURL(`geo:${lat},${lng}?q=${lat},${lng}(${label})`);
  } catch {
    await Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    );
  }
}
