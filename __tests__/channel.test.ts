import { openChannel } from '@/lib/supabase/channel';

const mockChannel = jest.fn((topic: string) => ({ topic }));
jest.mock('@/lib/supabase/client', () => ({
  supabase: { channel: (topic: string) => mockChannel(topic) },
}));

describe('openChannel', () => {
  it('opens a different channel each time, even for the same name', () => {
    const first = openChannel('item-social-1') as unknown as { topic: string };
    const second = openChannel('item-social-1') as unknown as { topic: string };
    expect(first.topic).not.toBe(second.topic);
    expect(first.topic.startsWith('item-social-1#')).toBe(true);
    expect(second.topic.startsWith('item-social-1#')).toBe(true);
  });
});
