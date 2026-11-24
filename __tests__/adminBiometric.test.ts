import {
  biometricLabel,
  biometricUnlockEnabled,
  disableBiometricUnlock,
  enableBiometricUnlock,
  readSavedPin,
} from '@/lib/adminBiometric';
import { enabledIconCount } from '@/lib/appIcon';

const mockStore = new Map<string, string>();
const mockSecure = new Map<string, string>();
let mockUserId: string | null = 'user-a';
let mockModules = true;
let mockIconCount: (() => Promise<number>) | undefined;
let mockReadError = false;

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: async (k: string) => mockStore.get(k) ?? null,
  setItem: async (k: string, v: string) => void mockStore.set(k, v),
  removeItem: async (k: string) => void mockStore.delete(k),
}));
jest.mock('expo', () => ({
  requireOptionalNativeModule: (name: string) => {
    if (name === 'ExpoAppIcon') return { enabledIconCount: mockIconCount };
    return mockModules ? {} : null;
  },
}));
jest.mock('expo-local-authentication', () => ({
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2 },
  hasHardwareAsync: async () => true,
  isEnrolledAsync: async () => true,
  supportedAuthenticationTypesAsync: async () => [1],
}));
jest.mock('expo-secure-store', () => ({
  WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 'passcode',
  setItemAsync: async (k: string, v: string) => void mockSecure.set(k, v),
  getItemAsync: async (k: string) => {
    if (mockReadError) throw new Error('User canceled the authentication');
    return mockSecure.get(k) ?? null;
  },
  deleteItemAsync: async (k: string) => void mockSecure.delete(k),
}));
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: async () => ({
        data: { session: mockUserId ? { user: { id: mockUserId } } : null },
      }),
    },
  },
}));

beforeEach(() => {
  mockStore.clear();
  mockSecure.clear();
  mockUserId = 'user-a';
  mockModules = true;
  mockIconCount = undefined;
  mockReadError = false;
});

describe('관리자 모드 생체 인증으로 열기', () => {
  it('모듈이 없는 빌드에서는 쓰지 않는다', async () => {
    mockModules = false;
    expect(await biometricLabel()).toBeNull();
    expect(await enableBiometricUnlock('123456')).toBe(false);
    expect(await biometricUnlockEnabled()).toBe(false);
  });

  it('지문만 있는 아이폰은 "Touch ID"로 부른다 (테스트는 아이폰으로 돈다)', async () => {
    expect(await biometricLabel()).toBe('Touch ID');
  });

  it('켜면 PIN을 저장하고, 같은 계정에서만 켜진 것으로 본다', async () => {
    expect(await enableBiometricUnlock('123456')).toBe(true);
    expect(await biometricUnlockEnabled()).toBe(true);
    expect(await readSavedPin()).toEqual({ pin: '123456' });

    mockUserId = 'user-b';
    expect(await biometricUnlockEnabled()).toBe(false);
  });

  it('끄면 저장한 PIN도 지운다', async () => {
    await enableBiometricUnlock('123456');
    await disableBiometricUnlock();
    expect(await biometricUnlockEnabled()).toBe(false);
    expect(mockSecure.size).toBe(0);
  });

  it('취소하면 cancelled, 저장한 PIN이 사라졌으면 lost로 알리고 끈다', async () => {
    await enableBiometricUnlock('123456');
    mockReadError = true;
    expect(await readSavedPin()).toEqual({ cancelled: true });
    expect(await biometricUnlockEnabled()).toBe(true);

    mockReadError = false;
    mockSecure.clear();
    expect(await readSavedPin()).toEqual({ lost: true });
    expect(await biometricUnlockEnabled()).toBe(false);
  });
});

describe('켜져 있는 앱 아이콘 수', () => {
  it('새 빌드의 네이티브 함수가 없으면 null', async () => {
    expect(await enabledIconCount()).toBeNull();
  });

  it('네이티브가 알려 준 수를 그대로 준다', async () => {
    mockIconCount = async () => 3;
    expect(await enabledIconCount()).toBe(3);
  });

  it('네이티브가 실패하면 null', async () => {
    mockIconCount = async () => {
      throw new Error('boom');
    };
    expect(await enabledIconCount()).toBeNull();
  });
});
