/** 동글동글한 제목용 글꼴 (굵기가 하나뿐이라 600 이상은 모두 이 글꼴) */
export const ROUND_FONT = 'Jua';

export const FONT_WEIGHTS = {
  '100': 'Pretendard-Thin',
  '200': 'Pretendard-ExtraLight',
  '300': 'Pretendard-Light',
  '400': 'Pretendard-Regular',
  '500': 'Pretendard-Medium',
  '600': ROUND_FONT,
  '700': ROUND_FONT,
  '800': ROUND_FONT,
  '900': ROUND_FONT,
} as const;

export type FontWeight = keyof typeof FONT_WEIGHTS;

export const VARIANT_FONT = {
  // 기본
  default: 'Pretendard-Regular', // 400

  // 제목
  display: ROUND_FONT, // 가장 큰 텍스트
  title: ROUND_FONT, // 헤더 타이틀
  heading: ROUND_FONT, // 섹션 제목
  subheading: ROUND_FONT, // 서브 제목

  // 본문
  body: 'Pretendard-Regular', // 400 - 일반 본문

  // 작은 텍스트
  caption: 'Pretendard-Medium', // 500 - 캡션, 타임스탬프
  label: 'Pretendard-Medium', // 500 - 라벨, 버튼 텍스트
  small: 'Pretendard-Regular', // 400 - 작은 텍스트
  tiny: 'Pretendard-Regular', // 400 - 극소 텍스트

  // 보조 텍스트
  muted: 'Pretendard-Regular', // 400 - 흐린 텍스트
  link: 'Pretendard-Regular', // 400 - 링크 텍스트
} as const;

export type TextVariant = keyof typeof VARIANT_FONT;
