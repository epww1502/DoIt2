import { compareVersions, installedVersion } from '@/lib/appVersion';

let mockRuntimeVersion: string | null = null;

jest.mock('expo-updates', () => ({
  get runtimeVersion() {
    return mockRuntimeVersion;
  },
}));
jest.mock('expo-constants', () => ({ expoConfig: { version: '0.2.0' } }));
jest.mock('@/lib/supabase/client', () => ({
  isSupabaseConfigured: false,
  supabase: {},
}));

describe('installedVersion', () => {
  it('runtimeVersion이 있으면 그 값을 쓴다', () => {
    mockRuntimeVersion = '0.3.0';
    expect(installedVersion()).toBe('0.3.0');
  });

  it('runtimeVersion이 없는 iOS 빌드(빈 문자열)는 앱 버전을 쓴다', () => {
    mockRuntimeVersion = '';
    expect(installedVersion()).toBe('0.2.0');
    // 업데이트 화면이 잘못 뜨던 버그: 같은 버전인데 낮다고 판단했다
    expect(compareVersions(installedVersion(), '0.2.0')).toBe(0);
  });

  it('runtimeVersion이 null이면 앱 버전을 쓴다', () => {
    mockRuntimeVersion = null;
    expect(installedVersion()).toBe('0.2.0');
  });
});

describe('compareVersions', () => {
  it('숫자로 비교한다', () => {
    expect(compareVersions('0.10.0', '0.9.1')).toBeGreaterThan(0);
    expect(compareVersions('0.2', '0.2.0')).toBe(0);
    expect(compareVersions('0.1.9', '0.2.0')).toBeLessThan(0);
  });
});
