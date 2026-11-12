import { applyTitleFont, FONT_WEIGHTS, VARIANT_FONT } from '@/constants/fonts';

describe('applyTitleFont (글씨체 고르기)', () => {
  afterEach(() => applyTitleFont('jua'));

  it('제목·굵은 글씨만 고른 글꼴로 바뀌고 본문은 그대로', () => {
    applyTitleFont('dohyeon');
    expect(FONT_WEIGHTS['700']).toBe('Round-DoHyeon');
    expect(VARIANT_FONT.title).toBe('Round-DoHyeon');
    expect(FONT_WEIGHTS['400']).toBe('Pretendard-Regular');
    expect(VARIANT_FONT.body).toBe('Pretendard-Regular');
  });

  it('모르는 값이 저장돼 있으면 기본(주아)으로', () => {
    applyTitleFont('없는글꼴' as never);
    expect(FONT_WEIGHTS['600']).toBe('Jua');
  });
});

jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn() }));
jest.mock('expo-font', () => ({ loadAsync: jest.fn() }));
jest.mock('@/store/useSettingsStore', () => ({ useSettingsStore: {} }));

describe('제목 글씨체 목록', () => {
  it('고딕(본문 글꼴 굵게)만 빼고 모두 불러올 파일이 있다', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TITLE_FILES } = require('@/hooks/useFontsLoader');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TITLE_FONTS } = require('@/constants/fonts');
    for (const font of Object.keys(TITLE_FONTS)) {
      if (font === 'gothic') continue;
      expect([font, TITLE_FILES[font]]).toEqual([font, expect.anything()]);
    }
  });
});
