import { Platform } from 'react-native';

import type { PlaceInfo } from '@/lib/bucket/types';
import { showAlert } from '@/lib/dialog';
import { MAP_APPS, openInMap, openInSystemMap } from '@/lib/mapLinks';

/**
 * 장소를 지도 앱으로 연다.
 * 안드로이드는 폰의 앱 선택 창이 뜨고, 아이폰은 그런 창이 없어 앱 목록을 보여준다.
 */
export function openPlace(place: PlaceInfo) {
  if (Platform.OS === 'android') {
    void openInSystemMap(place);
    return;
  }
  showAlert(place.name, place.address, [
    // 버튼이 세로로 쌓이면 거꾸로 그려지므로, 카카오맵이 맨 위에 오게 뒤집어 넘긴다
    ...[...MAP_APPS].reverse().map((app) => ({
      text: `${app.label}에서 보기`,
      onPress: () => void openInMap(app.key, { type: 'place', place }),
    })),
    { text: '닫기', style: 'cancel' as const },
  ]);
}
