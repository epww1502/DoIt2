import { saveNicknameQuietly } from '@/lib/nickname';

const mockState = {
  loadStatus: 'idle' as 'idle' | 'ready' | 'error',
  profile: null as { nickname: string | null } | null,
  load: jest.fn(async () => {
    mockState.loadStatus = 'ready';
  }),
  save: jest.fn(async (_patch: { nickname: string | null }) => {}),
};
jest.mock('@/store/useProfileStore', () => ({
  useProfileStore: { getState: () => mockState },
}));

describe('saveNicknameQuietly', () => {
  beforeEach(() => {
    mockState.loadStatus = 'idle';
    mockState.profile = null;
    mockState.load.mockClear();
    mockState.save.mockClear();
  });

  it('does nothing when the name is empty', async () => {
    await saveNicknameQuietly('   ');
    expect(mockState.load).not.toHaveBeenCalled();
    expect(mockState.save).not.toHaveBeenCalled();
  });

  it('loads the profile first, then saves the trimmed name', async () => {
    await saveNicknameQuietly('  민지 ');
    expect(mockState.load).toHaveBeenCalledTimes(1);
    expect(mockState.save).toHaveBeenCalledWith({ nickname: '민지' });
  });

  it('does not save again when the name is already the same', async () => {
    mockState.loadStatus = 'ready';
    mockState.profile = { nickname: '민지' };
    await saveNicknameQuietly('민지');
    expect(mockState.save).not.toHaveBeenCalled();
  });

  it('swallows failures so starting is never blocked', async () => {
    mockState.load.mockRejectedValueOnce(new Error('offline'));
    await expect(saveNicknameQuietly('민지')).resolves.toBeUndefined();
    expect(mockState.save).not.toHaveBeenCalled();
  });
});
