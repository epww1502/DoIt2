/**
 * 푸시 알림: 이 폰을 등록하고, 같은 공간 사람들에게 알림을 보낸다.
 * - 받기: Expo 푸시 토큰을 서버(push_tokens)에 저장한다
 * - 보내기: Edge Function notify가 같은 공간의 다른 사람들에게 보낸다
 *
 * Expo Go(안드로이드)와 알림 부품이 없는 예전 APK에서는 받기를 건너뛴다.
 * expo-notifications를 바로 불러오면 그런 앱에서 멈출 수 있어서, 쓸 수 있을 때만 불러온다.
 */
import { requireOptionalNativeModule } from 'expo';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase/client';
import { isExpoGo } from '@/lib/utils';

/** 이 앱에서 알림을 받을 수 있는지 */
export function isPushSupported() {
  return (
    !isExpoGo() &&
    // Expo Go는 appOwnership이 'expo'로 나온다 (실행 환경 값이 다르게 올 때 대비)
    Constants.appOwnership !== 'expo' &&
    Platform.OS !== 'web' &&
    // 알림 부품이 다 들어 있는 빌드에서만 (Expo Go·예전 APK에는 일부가 없다)
    requireOptionalNativeModule('ExpoPushTokenManager') !== null &&
    // 토픽 구독 모듈은 안드로이드에만 있다 (iOS에서 확인하면 알림이 늘 꺼진다)
    (Platform.OS !== 'android' ||
      requireOptionalNativeModule('ExpoTopicSubscriptionModule') !== null)
  );
}

/** expo-notifications (isPushSupported()일 때만 부른다) */
export async function loadNotifications() {
  return import('expo-notifications');
}

let handlerReady = false;

/** 앱이 켜져 있을 때 온 알림도 위에 띄운다 (한 번만) */
export async function setupNotificationHandler() {
  if (!isPushSupported() || handlerReady) return;
  handlerReady = true;
  const Notifications = await loadNotifications();
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: '함께하는 사람 소식',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 120, 200],
    });
  }
}

/** 지금 이 폰의 푸시 토큰 (권한이 없으면 묻고, 거절하면 null) */
async function getPushToken() {
  const Notifications = await loadNotifications();
  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted;
  if (!granted && current.canAskAgain) {
    granted = (await Notifications.requestPermissionsAsync()).granted;
  }
  if (!granted) return null;
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

/** 이 폰을 알림 받는 폰으로 등록한다. 등록했으면 true */
export async function registerForPush() {
  if (!isPushSupported()) return false;
  await setupNotificationHandler();
  const token = await getPushToken();
  if (!token) return false;
  const { error } = await supabase.rpc('claim_push_token', {
    push_token: token,
    push_platform: Platform.OS,
  });
  if (error) throw error;
  return true;
}

/** 이 폰은 알림을 받지 않는다 (설정에서 끔) */
export async function unregisterForPush() {
  if (!isPushSupported()) return;
  const Notifications = await loadNotifications();
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync({
    projectId,
  });
  await supabase.from('push_tokens').delete().eq('token', token);
}

/** 같은 공간의 다른 사람들에게 알린다. 실패해도 앱 동작에는 영향이 없다 */
export function notifySpace(
  spaceId: string,
  event: 'added' | 'done' | 'reviewed' | 'commented' | 'todo' | 'photos',
  itemIds: string[],
  extra?: {
    /** event 'todo': 체크한 할 것 id들 */
    todoIds?: string[];
    /** event 'photos': 새로 올린 사진 수 */
    photoCount?: number;
  }
) {
  if (itemIds.length === 0) return;
  void supabase.functions
    .invoke('notify', { body: { spaceId, event, itemIds, ...extra } })
    .catch(() => {});
}

/** 알림을 눌렀을 때 넘어온 값 */
/** spaceId: null이면 '나만 보기' 항목 (폰 안 알림) */
export type PushData = { spaceId?: string | null; itemId?: string | null };

/**
 * 알림을 누르면 부를 함수를 건다. 앱이 꺼져 있다가 알림으로 켜진 경우도 처리한다.
 * 돌려준 함수를 부르면 해제된다.
 */
export async function onNotificationOpen(handler: (data: PushData) => void) {
  if (!isPushSupported()) return () => {};
  let Notifications: Awaited<ReturnType<typeof loadNotifications>>;
  try {
    Notifications = await loadNotifications();
  } catch {
    return () => {};
  }
  const last = await Notifications.getLastNotificationResponseAsync();
  if (last) {
    handler(last.notification.request.content.data as PushData);
    await Notifications.clearLastNotificationResponseAsync();
  }
  const sub = Notifications.addNotificationResponseReceivedListener((r) =>
    handler(r.notification.request.content.data as PushData)
  );
  return () => sub.remove();
}
