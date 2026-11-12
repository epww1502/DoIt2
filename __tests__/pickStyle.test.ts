import { slotDelays } from '@/components/bucket/PickSlot';

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: 'View' },
  FadeIn: {},
  ZoomIn: {},
}));
jest.mock('@/components/atoms', () => ({ Text: 'Text' }));
jest.mock('@/components/bucket/ItemIcon', () => ({ ItemIcon: 'ItemIcon' }));

describe('slotDelays', () => {
  it('처음엔 빠르고 끝으로 갈수록 느려진다', () => {
    const delays = slotDelays();
    expect(delays[0]).toBe(50);
    expect(delays[delays.length - 1]).toBe(320);
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeGreaterThanOrEqual(delays[i - 1]);
    }
  });

  it('전체 시간은 2초 안팎이라 기다리기 지루하지 않다', () => {
    const total = slotDelays().reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(1500);
    expect(total).toBeLessThan(3000);
  });
});
