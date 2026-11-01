import { Platform } from 'react-native';

import type { PlaceInfo } from '@/lib/bucket/types';
import { showAlert } from '@/lib/dialog';
import {
  MAP_APPS,
  openInMap,
  openInSystemMap,
  type MapTarget,
} from '@/lib/mapLinks';

/**
 * 장소를 지도 앱으로 연다.
 * 안드로이드는 폰의 앱 선택 창이 뜨고, 아이폰은 그런 창이 없어 앱 목록을 보여준다.
 */
export function openPlace(place: PlaceInfo) {
  openMapTarget({ type: 'place', place });
}

/** 장소, 또는 적어 둔 위치 글자(검색)를 지도 앱으로 연다 */
export function openMapTarget(target: MapTarget) {
  if (Platform.OS === 'android') {
    void openInSystemMap(target);
    return;
  }
  const [title, message] =
    target.type === 'place'
      ? [target.place.name, target.place.address]
      : [target.query, '이 위치로 검색해서 열어요'];
  showAlert(title, message, [
    // 버튼이 세로로 쌓이면 거꾸로 그려지므로, 카카오맵이 맨 위에 오게 뒤집어 넘긴다
    ...[...MAP_APPS].reverse().map((app) => ({
      text: `${app.label}에서 보기`,
      onPress: () => void openInMap(app.key, target),
    })),
    { text: '닫기', style: 'cancel' as const },
  ]);
}
