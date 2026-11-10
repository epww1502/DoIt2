import { flushErrors, reportError, toErrorRow } from '@/lib/errorReport';

const mockStore = new Map<string, string>();
const mockInsert = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: async (k: string) => mockStore.get(k) ?? null,
  setItem: async (k: string, v: string) => void mockStore.set(k, v),
}));
jest.mock('expo-updates', () => ({
  updateId: 'update-1',
  runtimeVersion: '0.2.0',
}));
jest.mock('expo-constants', () => ({ expoConfig: { version: '0.2.0' } }));
jest.mock('@/lib/supabase/client', () => ({
  isSupabaseConfigured: true,
  supabase: { from: () => ({ insert: (rows: unknown) => mockInsert(rows) }) },
}));

// 개발 중에는 남기지 않으므로, 테스트에서는 실제 앱처럼 꺼 둔다
(globalThis as { __DEV__?: boolean }).__DEV__ = false;

const pending = () =>
  JSON.parse(mockStore.get('app-errors:pending') ?? '[]') as unknown[];

beforeEach(() => {
  mockStore.clear();
  mockInsert.mockReset();
});

describe('toErrorRow', () => {
  it('서버 오류는 코드를 붙이고, 긴 글은 표 칸 길이에 맞게 자른다', () => {
    const row = toErrorRow('alert', {
      message: 'x'.repeat(2000),
      code: '42501',
      stack: 's'.repeat(5000),
    });
    expect(row.message.startsWith('[42501] ')).toBe(true);
    expect(row.message).toHaveLength(1000);
    expect(row.stack).toHaveLength(4000);
    expect(row.app_version).toBe('0.2.0');
    expect(row.update_id).toBe('update-1');
  });

  it('Error가 아닌 값이 던져져도 글로 남긴다', () => {
    expect(toErrorRow('crash', 'boom').message).toBe('boom');
    expect(toErrorRow('crash', undefined).message).toBe('undefined');
  });
});

describe('reportError · flushErrors', () => {
  it('보내면 폰에 적어 둔 것을 비운다', async () => {
    mockInsert.mockResolvedValue({ error: null });
    await reportError('alert', new Error('저장 실패 A'), '저장하지 못했어요');
    await flushErrors();
    expect(mockInsert).toHaveBeenCalled();
    expect(pending()).toHaveLength(0);
  });

  it('인터넷이 없으면 남겨 두었다가 다음에 보낸다', async () => {
    mockInsert.mockResolvedValue({
      error: { name: 'TypeError', message: 'Network request failed' },
    });
    await reportError('crash', new Error('꺼짐 B'));
    await flushErrors();
    expect(pending()).toHaveLength(1);

    mockInsert.mockResolvedValue({ error: null });
    await flushErrors();
    expect(pending()).toHaveLength(0);
  });

  it('서버가 거절한 오류는 계속 막히지 않게 버린다', async () => {
    mockInsert.mockResolvedValue({
      error: { code: '23514', message: 'check' },
    });
    await reportError('screen', new Error('화면 C'));
    await flushErrors();
    expect(pending()).toHaveLength(0);
  });

  it('같은 오류는 한 번만 적는다', async () => {
    mockInsert.mockResolvedValue({
      error: { name: 'TypeError', message: 'Network request failed' },
    });
    await reportError('alert', new Error('같은 오류 D'));
    await reportError('alert', new Error('같은 오류 D'));
    await flushErrors();
    expect(pending()).toHaveLength(1);
  });
});
