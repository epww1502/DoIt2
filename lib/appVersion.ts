/**
 * 설치된 앱(빌드) 버전이 서버 app_versions 표의 min_version보다 낮으면
 * 업데이트를 꼭 하게 한다 (VersionGate가 앱을 덮는 화면을 띄운다).
 */
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Linking, Platform } from 'react-native';

import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';

const ANDROID_PACKAGE = 'com.doit2.app';

export type RequiredUpdate = {
  minVersion: string;
  storeUrl: string;
  message: string | null;
};

/**
 * 설치된 빌드의 버전. runtimeVersion 정책이 appVersion이라 앱 버전(app.json version)과 같다.
 * OTA로 화면 코드가 바뀌어도 이 값은 그대로라 "빌드" 버전을 나타낸다.
 */
export function installedVersion() {
  return Updates.runtimeVersion ?? Constants.expoConfig?.version ?? '0.0.0';
}

/** '0.10.1' 같은 버전을 숫자로 비교한다. a가 낮으면 음수 */
export function compareVersions(a: string, b: string) {
  const pa = a.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** 업데이트가 꼭 필요하면 그 정보를, 아니면(인터넷이 없을 때도) null을 돌려준다 */
export async function checkRequiredUpdate(): Promise<RequiredUpdate | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('app_versions')
      .select('min_version, store_url, message')
      .eq('platform', Platform.OS)
      .maybeSingle();
    if (error || !data) return null;
    if (compareVersions(installedVersion(), data.min_version) >= 0) return null;
    return {
      minVersion: data.min_version,
      storeUrl: data.store_url,
      message: data.message,
    };
  } catch {
    return null;
  }
}

/**
 * 서버 app_versions.store_url에 적힌 주소를 연다 (표에서 바꾸면 바로 반영된다).
 * play.google.com 주소면 안드로이드가 Play 스토어 앱으로 열어준다.
 * 주소가 잘못돼 못 열면 Play 스토어 앱의 DoIt2 페이지로 연다.
 */
export async function openStore(storeUrl: string) {
  try {
    await Linking.openURL(storeUrl);
  } catch {
    if (Platform.OS === 'android') {
      await Linking.openURL(`market://details?id=${ANDROID_PACKAGE}`);
    }
  }
}
