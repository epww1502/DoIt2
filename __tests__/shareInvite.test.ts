import { Share } from 'react-native';

import { shareInvite } from '@/lib/shareInvite';

const mockTrackStep = jest.fn();
jest.mock('@/lib/steps', () => ({
  trackStep: (...args: unknown[]) => mockTrackStep(...args),
}));

const space = { name: '우리 둘', emoji: '🧑‍🤝‍🧑', invite_code: 'K7M2QX' };

describe('shareInvite', () => {
  beforeEach(() => mockTrackStep.mockReset());

  it('counts the invite when it was shared, with where it came from', async () => {
    jest.spyOn(Share, 'share').mockResolvedValueOnce({
      action: Share.sharedAction,
      activityType: undefined,
    });
    await shareInvite(space, 'space');
    expect(mockTrackStep).toHaveBeenCalledWith('invite_sent', 'space');
  });

  it('does not count it when the share sheet was dismissed', async () => {
    jest.spyOn(Share, 'share').mockResolvedValueOnce({
      action: Share.dismissedAction,
      activityType: undefined,
    });
    await shareInvite(space, 'home');
    expect(mockTrackStep).not.toHaveBeenCalled();
  });

  it('does not count it when the share sheet could not open', async () => {
    jest.spyOn(Share, 'share').mockRejectedValueOnce(new Error('no'));
    await shareInvite(space, 'welcome');
    expect(mockTrackStep).not.toHaveBeenCalled();
  });
});
