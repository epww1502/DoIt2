/**
 * 앱 진동은 모두 여기를 거친다. 설정에서 진동을 끄면 아무 데서도 울리지 않는다.
 * 진동을 못 쓰는 기기에서 실패해도 무시한다.
 */
import * as Haptics from 'expo-haptics';

import { useSettingsStore } from '@/store/useSettingsStore';

const enabled = () => useSettingsStore.getState().haptics;

/** 길게 눌러 고르기 모드를 켤 때 같은 '툭' */
export function hapticPress() {
  if (!enabled()) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

/** 고르기/빼기처럼 가볍게 '틱' */
export function hapticSelect() {
  if (!enabled()) return;
  void Haptics.selectionAsync().catch(() => {});
}

/** 뽑기 결과처럼 '성공' */
export function hapticSuccess() {
  if (!enabled()) return;
  void Haptics.notificationAsync(
    Haptics.NotificationFeedbackType.Success
  ).catch(() => {});
}
