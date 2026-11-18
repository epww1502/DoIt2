import { AuthRetryableFetchError } from '@supabase/supabase-js';

import { InvalidAccountCodeError } from '@/lib/supabase/account';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useSpaceStore } from '@/store/useSpaceStore';

const mockGetSession = jest.fn();
const mockSignInAnonymously = jest.fn();
const mockSignOut = jest.fn();
const mockRestore = jest.fn();
const mockIssue = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      signInAnonymously: () => mockSignInAnonymously(),
      signOut: () => mockSignOut(),
    },
    // 공간 목록: 빈 목록
    from: () => ({
      select: () => {
        const empty = Promise.resolve({ data: [], error: null });
        return Object.assign(empty, { order: () => empty });
      },
    }),
  },
}));
jest.mock('@/lib/connection', () => ({ noteFailure: jest.fn() }));
jest.mock('@/lib/photoCache', () => ({ clearSavedPhotos: jest.fn() }));
jest.mock('@/lib/bucket/photo', () => ({ deletePhoto: jest.fn() }));
jest.mock('@/lib/supabase/bucketRemote', () => ({}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@/lib/supabase/account', () => {
  class InvalidAccountCodeError extends Error {}
  return {
    InvalidAccountCodeError,
    signInWithAccountCode: (code: string) => mockRestore(code),
    ensureAccountCode: () => mockIssue(),
  };
});

const noSession = { data: { session: null }, error: null };
const anon = (id: string) => ({ data: { user: { id } }, error: null });
const saved = (userId: string, code: string) =>
  useSettingsStore.getState().setAccountCode({ userId, code });
/** 저절로 코드를 만드는 일(기다리지 않고 도는 것)이 끝나게 한다 */
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  mockSignOut.mockResolvedValue({ error: null });
  mockIssue.mockResolvedValue('NEW1-NEW2-NEW3');
  useSpaceStore.setState({ status: 'loading', userId: null, spaces: [] });
  useSettingsStore.getState().setAccountCode(null);
});

describe('켤 때 계정 확인', () => {
  it('인터넷이 안 돼서 로그인을 새로 받지 못하면 새 계정을 만들지 않는다', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: new AuthRetryableFetchError('Failed to fetch', 0),
    });
    await useSpaceStore.getState().init();
    expect(mockSignInAnonymously).not.toHaveBeenCalled();
    expect(useSpaceStore.getState().status).toBe('error');
  });

  it('저장된 로그인이 있으면 그 계정 그대로 쓴다', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'old-user' } } },
      error: null,
    });
    await useSpaceStore.getState().init();
    expect(mockSignInAnonymously).not.toHaveBeenCalled();
    expect(useSpaceStore.getState().userId).toBe('old-user');
  });

  it('처음 켠 사람(저장된 로그인 없음)은 새 계정으로 시작한다', async () => {
    mockGetSession.mockResolvedValue(noSession);
    mockSignInAnonymously.mockResolvedValue(anon('new-user'));
    await useSpaceStore.getState().init();
    expect(useSpaceStore.getState().userId).toBe('new-user');
    expect(useSpaceStore.getState().status).toBe('ready');
  });

  it('로그인이 사라져도 폰에 저장한 계정 코드로 원래 계정에 돌아간다', async () => {
    saved('old-user', 'OLD1-OLD2-OLD3');
    mockGetSession.mockResolvedValue(noSession);
    mockSignInAnonymously.mockResolvedValue(anon('temp-user'));
    mockRestore.mockResolvedValue('old-user');
    await useSpaceStore.getState().init();
    expect(mockRestore).toHaveBeenCalledWith('OLD1-OLD2-OLD3');
    expect(useSpaceStore.getState().userId).toBe('old-user');
    await flush();
    // 이미 코드가 있으니 새로 만들지 않는다
    expect(mockIssue).not.toHaveBeenCalled();
  });

  it('코드로 돌아가다 인터넷이 끊기면 잠깐 들어간 계정을 지우고 다음에 다시 시도한다', async () => {
    saved('old-user', 'OLD1-OLD2-OLD3');
    mockGetSession.mockResolvedValue(noSession);
    mockSignInAnonymously.mockResolvedValue(anon('temp-user'));
    mockRestore.mockRejectedValue(new Error('offline'));
    await useSpaceStore.getState().init();
    expect(mockSignOut).toHaveBeenCalled();
    expect(useSpaceStore.getState().status).toBe('error');
    expect(useSettingsStore.getState().accountCode?.userId).toBe('old-user');
  });

  it('저장한 코드를 더 못 쓰면 새 계정으로 시작하고 새 코드를 저장한다', async () => {
    saved('gone-user', 'GONE-GONE-GONE');
    mockGetSession.mockResolvedValue(noSession);
    mockSignInAnonymously.mockResolvedValue(anon('new-user'));
    mockRestore.mockRejectedValue(new InvalidAccountCodeError('x'));
    await useSpaceStore.getState().init();
    await flush();
    expect(useSpaceStore.getState().userId).toBe('new-user');
    expect(useSettingsStore.getState().accountCode).toEqual({
      userId: 'new-user',
      code: 'NEW1-NEW2-NEW3',
    });
  });

  it('계정 코드가 없으면 저절로 만들어 폰에 저장해 둔다', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'old-user' } } },
      error: null,
    });
    await useSpaceStore.getState().init();
    await flush();
    expect(useSettingsStore.getState().accountCode).toEqual({
      userId: 'old-user',
      code: 'NEW1-NEW2-NEW3',
    });
  });

  it('다른 계정의 코드가 저장돼 있으면 덮어쓰지 않는다', async () => {
    saved('other-user', 'OTHR-OTHR-OTHR');
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'me' } } },
      error: null,
    });
    await useSpaceStore.getState().init();
    await flush();
    expect(mockIssue).not.toHaveBeenCalled();
    expect(useSettingsStore.getState().accountCode?.code).toBe(
      'OTHR-OTHR-OTHR'
    );
  });

  it('서버에 이미 코드가 있으면(폰 밖에 적어 둔 코드) 새로 만들지 않고 그대로 둔다', async () => {
    mockIssue.mockResolvedValue(null);
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'written-user' } } },
      error: null,
    });
    await useSpaceStore.getState().init();
    await flush();
    expect(mockIssue).toHaveBeenCalledTimes(1);
    expect(useSettingsStore.getState().accountCode).toBeNull();
    // 다시 확인해도 서버에 또 묻지 않는다
    await useSpaceStore.getState().init();
    await flush();
    expect(mockIssue).toHaveBeenCalledTimes(1);
  });
});
