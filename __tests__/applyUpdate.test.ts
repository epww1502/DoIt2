import { applyUpdate } from '@/hooks/useStartupUpdate';

const mockCheck = jest.fn();
const mockFetch = jest.fn();
const mockReload = jest.fn();

jest.mock('expo-updates', () => ({
  checkForUpdateAsync: () => mockCheck(),
  fetchUpdateAsync: () => mockFetch(),
  reloadAsync: (o: unknown) => mockReload(o),
  isEnabled: true,
}));
jest.mock('@/lib/dialog', () => ({ showAlert: jest.fn() }));

/** ms 뒤에 value로 끝나는 약속 */
const after = <T>(ms: number, value: T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

beforeEach(() => {
  jest.useFakeTimers();
  mockCheck.mockReset();
  mockFetch.mockReset();
  mockReload.mockReset();
});
afterEach(() => jest.useRealTimers());

describe('applyUpdate', () => {
  it('새 버전이 없으면 아무 일도 없다', async () => {
    mockCheck.mockResolvedValue({ isAvailable: false });
    const onSlow = jest.fn();
    await applyUpdate(4000, onSlow);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockReload).not.toHaveBeenCalled();
    expect(onSlow).not.toHaveBeenCalled();
  });

  it('금방 받으면 묻지 않고 바로 다시 켠다', async () => {
    mockCheck.mockResolvedValue({ isAvailable: true });
    mockFetch.mockReturnValue(after(1000, { isNew: true }));
    const onSlow = jest.fn();
    const run = applyUpdate(4000, onSlow);
    await jest.advanceTimersByTimeAsync(1000);
    await run;
    expect(mockReload).toHaveBeenCalledTimes(1);
    expect(onSlow).not.toHaveBeenCalled();
  });

  it('받는 게 느리면 다시 켜지 않고, 다 받은 뒤 물어본다', async () => {
    mockCheck.mockResolvedValue({ isAvailable: true });
    mockFetch.mockReturnValue(after(10000, { isNew: true }));
    const onSlow = jest.fn();
    const run = applyUpdate(4000, onSlow);
    await jest.advanceTimersByTimeAsync(4000);
    expect(onSlow).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(6000);
    await run;
    expect(onSlow).toHaveBeenCalledTimes(1);
    expect(mockReload).not.toHaveBeenCalled();
  });

  it('켤 때(물어볼 곳 없음) 느리면 지금 버전으로 넘어간다', async () => {
    mockCheck.mockResolvedValue({ isAvailable: true });
    mockFetch.mockReturnValue(after(20000, { isNew: true }));
    const run = applyUpdate(12000);
    await jest.advanceTimersByTimeAsync(12000);
    await run;
    expect(mockReload).not.toHaveBeenCalled();
  });

  it('인터넷이 없어 확인이 실패해도 던지지 않는다', async () => {
    mockCheck.mockRejectedValue(new Error('offline'));
    await expect(applyUpdate(4000, jest.fn())).resolves.toBeUndefined();
  });
});
