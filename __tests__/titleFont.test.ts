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
