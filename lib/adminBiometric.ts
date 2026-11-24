/**
 * 관리자 모드를 Face ID·지문으로 열기 (0.3.1 빌드부터).
 * PIN을 이 폰의 보안 저장소에 생체 인증을 걸어 넣어 두고, 열 때 생체 인증이 맞으면 그 PIN을 꺼내 서버에 보낸다.
 * 서버가 PIN을 확인하는 것은 그대로라 틀린 횟수·잠금 규칙도 그대로다.
 *
 * - 저장한 계정과 지금 계정이 다르면 쓰지 않는다 (남의 PIN을 보내 틀린 횟수가 쌓이지 않게).
 * - 폰에 지문·얼굴을 새로 등록하면 저장한 PIN은 OS가 지운다. 그때는 PIN을 다시 넣고 다시 켜면 된다.
 * - 생체 인증 모듈이 없는 빌드(0.3.0)에서는 아무것도 하지 않는다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase/client';

const PIN_KEY = 'doit2.admin-pin';
/** 생체 인증으로 열기를 켠 계정 id (켜 둔 것만 기억한다. PIN은 여기 없다) */
const OWNER_KEY = 'doit2-admin-biometric-owner';

/** PIN으로 연 뒤 "다음부터 생체 인증으로 열까요?"에 '나중에'를 고른 적이 있는지 (다시 묻지 않는다) */
const DECLINED_KEY = 'doit2-admin-biometric-declined';

const PROMPT = '관리자 모드 열기';

export async function biometricOfferDeclined() {
  try {
    return (await AsyncStorage.getItem(DECLINED_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function declineBiometricOffer() {
  try {
    await AsyncStorage.setItem(DECLINED_KEY, '1');
  } catch {
    // 못 적으면 다음에 한 번 더 물을 뿐이다
  }
}

// 모듈이 없는 빌드에서 불러오면 앱이 죽으므로, 있는 것을 확인한 뒤에만 불러온다
const loadLocalAuthentication = () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('expo-local-authentication') as typeof import('expo-local-authentication');
const loadSecureStore = () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('expo-secure-store') as typeof import('expo-secure-store');

/** 이 빌드에 생체 인증 모듈이 들어 있는지 */
export function biometricModulesAvailable() {
  return (
    requireOptionalNativeModule('ExpoLocalAuthentication') !== null &&
    requireOptionalNativeModule('ExpoSecureStore') !== null
  );
}

/** 이 폰에서 생체 인증을 쓸 수 있으면 부를 이름('Face ID', '지문' 등), 못 쓰면 null */
export async function biometricLabel(): Promise<string | null> {
  if (!biometricModulesAvailable()) return null;
  try {
    const LocalAuthentication = loadLocalAuthentication();
    const [hardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    if (!hardware || !enrolled) return null;
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const face = types.includes(
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
    );
    if (face) return Platform.OS === 'ios' ? 'Face ID' : '얼굴 인식';
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return Platform.OS === 'ios' ? 'Touch ID' : '지문';
    }
    return '생체 인증';
  } catch {
    return null;
  }
}

async function currentUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** 지금 계정이 생체 인증으로 열기를 켜 두었는지 (생체 인증 창은 띄우지 않는다) */
export async function biometricUnlockEnabled() {
  if (!biometricModulesAvailable()) return false;
  try {
    const [owner, userId] = await Promise.all([
      AsyncStorage.getItem(OWNER_KEY),
      currentUserId(),
    ]);
    return owner !== null && owner === userId;
  } catch {
    return false;
  }
}

/** 방금 서버가 맞다고 한 PIN을 생체 인증을 걸어 저장한다. 저장했으면 true */
export async function enableBiometricUnlock(pin: string) {
  if (!biometricModulesAvailable()) return false;
  try {
    const userId = await currentUserId();
    if (!userId) return false;
    const SecureStore = loadSecureStore();
    await SecureStore.setItemAsync(PIN_KEY, pin, {
      requireAuthentication: true,
      authenticationPrompt: PROMPT,
      keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
    });
    await AsyncStorage.setItem(OWNER_KEY, userId);
    return true;
  } catch {
    return false;
  }
}

/** 저장한 PIN을 지우고 생체 인증으로 열기를 끈다 */
export async function disableBiometricUnlock() {
  try {
    await AsyncStorage.removeItem(OWNER_KEY);
    if (!biometricModulesAvailable()) return;
    const SecureStore = loadSecureStore();
    await SecureStore.deleteItemAsync(PIN_KEY);
  } catch {
    // 지우지 못해도 켜 둔 표시는 지웠으니 다시 쓰지 않는다
  }
}

export type SavedPinResult =
  | { pin: string }
  /** 사용자가 취소했거나 생체 인증이 안 맞음: PIN을 넣게 한다 */
  | { cancelled: true }
  /** 저장한 PIN이 없어짐 (지문·얼굴을 새로 등록함 등): 끄고 PIN을 넣게 한다 */
  | { lost: true };

/** 생체 인증 창을 띄워 저장한 PIN을 꺼낸다 */
export async function readSavedPin(): Promise<SavedPinResult> {
  try {
    const SecureStore = loadSecureStore();
    const pin = await SecureStore.getItemAsync(PIN_KEY, {
      requireAuthentication: true,
      authenticationPrompt: PROMPT,
    });
    if (!pin) {
      await disableBiometricUnlock();
      return { lost: true };
    }
    return { pin };
  } catch {
    return { cancelled: true };
  }
}
