/**
 * 제목·버튼·칩에 쓰는 글씨체 (설정에서 고른다. 굵기가 하나뿐이라 600 이상은 모두 이 글꼴).
 * 글꼴마다 이름을 따로 둔다: 같은 이름에 다른 파일을 넣으면 폰이 예전 글꼴을 기억하고 있어서 안 바뀐다
 */
export const TITLE_FONTS = {
  jua: { label: '주아', hint: '동글동글', family: 'Jua' },
  dohyeon: { label: '도현', hint: '또박또박 굵게', family: 'Round-DoHyeon' },
  gaegu: { label: '개구', hint: '손글씨', family: 'Round-Gaegu' },
  gothic: { label: '고딕', hint: '깔끔하게', family: 'Pretendard-Bold' },
} as const;
export type TitleFont = keyof typeof TITLE_FONTS;

/** 기본 제목 글씨체 */
export const ROUND_FONT: string = TITLE_FONTS.jua.family;

export const FONT_WEIGHTS: Record<
  '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900',
  string
> = {
  '100': 'Pretendard-Thin',
  '200': 'Pretendard-ExtraLight',
  '300': 'Pretendard-Light',
  '400': 'Pretendard-Regular',
  '500': 'Pretendard-Medium',
  '600': ROUND_FONT,
  '700': ROUND_FONT,
  '800': ROUND_FONT,
  '900': ROUND_FONT,
};

export type FontWeight = keyof typeof FONT_WEIGHTS;

export const VARIANT_FONT: Record<
  | 'default'
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'caption'
  | 'label'
  | 'small'
  | 'tiny'
  | 'muted'
  | 'link',
  string
> = {
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
};

export type TextVariant = keyof typeof VARIANT_FONT;

/**
 * 제목 글씨체를 고른 글꼴로 바꿔 끼운다. 앱을 켤 때 글꼴을 불러오기 전에 한 번만 부른다.
 * ponytail: 화면 코드가 FONT_WEIGHTS·VARIANT_FONT를 그릴 때 읽어서, 켤 때 한 번 바꾸면 전부 따라간다.
 * 그래서 바꾸면 앱을 다시 불러와야 적용된다. 바로 바꾸고 싶어지면 글씨체를 context로 내려야 한다
 */
export function applyTitleFont(font: TitleFont) {
  const family = (TITLE_FONTS[font] ?? TITLE_FONTS.jua).family;
  for (const w of ['600', '700', '800', '900'] as const)
    FONT_WEIGHTS[w] = family;
  for (const v of ['display', 'title', 'heading', 'subheading'] as const) {
    VARIANT_FONT[v] = family;
  }
}
