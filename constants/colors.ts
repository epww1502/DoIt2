export const colors = {
  white: '#FFFFFF',
  black: '#000000',
  primary: '#466CFF',
  kakao: '#FEE500',
  highlightBlue: '#4285F4',
  highlightRed: '#f28b82',
  homebg: '#F5F7FF',
  gray: {
    50: '#fafafc',
    100: '#e8e8ee',
    200: '#c2c2c7',
    300: '#aaaaaa',
    400: '#90919a',
    500: '#747475',
    600: '#4e4e52',
    700: '#292930',
    800: '#17171c',
    900: '#101013',
  },
  blue: {
    50: '#E9F2FE',
    100: '#c9e2ff',
    200: '#90c2ff',
    300: '#64a8ff',
    400: '#00AAFF',
    500: '#466CFF',
    600: '#3F61E6',
    700: '#1B64DA',
    800: '#1957c2',
    900: '#194aa6',
  },
  red: {
    50: '#ffeeee',
    100: '#ffd4d6',
    200: '#feafb4',
    300: '#fb8890',
    400: '#FF4444',
    500: '#F14452',
    600: '#FF0000',
    700: '#d22030',
    800: '#bc1b2a',
    900: '#a51926',
  },
  orange: {
    50: '#fff3e0',
    100: '#ffe0b0',
    200: '#ffcd80',
    300: '#ffbd51',
    400: '#ffa927',
    500: '#fe9800',
    600: '#fb8800',
    700: '#f57800',
    800: '#ed6700',
    900: '#e45600',
  },
  yellow: {
    50: '#fff9e7',
    100: '#ffefbf',
    200: '#ffe69b',
    300: '#ffdd78',
    400: '#ffd158',
    500: '#ffc342',
    600: '#ffb331',
    700: '#faa131',
    800: '#ee8f11',
    900: '#dd7d02',
  },
  green: {
    50: '#f0faf6',
    100: '#aeefd5',
    200: '#76e4b8',
    300: '#3fd599',
    400: '#15c47e',
    500: '#03b26c',
    600: '#02a262',
    700: '#029359',
    800: '#028450',
    900: '#027648',
  },
  teal: {
    50: '#edf8f8',
    100: '#bce9e9',
    200: '#89d8d8',
    300: '#58c7c7',
    400: '#30b6b6',
    500: '#18a5a5',
    600: '#109595',
    700: '#0c8585',
    800: '#097575',
    900: '#076565',
  },
  purple: {
    50: '#f9f0fc',
    100: '#edccf8',
    200: '#da9bef',
    300: '#c770e4',
    400: '#b44bd7',
    500: '#a234c7',
    600: '#9128b4',
    700: '#8222a2',
    800: '#73228e',
    900: '#65237b',
  },
  greyOpacity: {
    50: 'rgba(0, 23, 51, 0.02)',
    100: 'rgba(2, 32, 71, 0.05)',
    200: 'rgba(0, 27, 55, 0.10)',
    300: 'rgba(0, 29, 58, 0.18)',
    400: 'rgba(0, 25, 54, 0.31)',
    500: 'rgba(3, 24, 50, 0.46)',
    600: 'rgba(0, 19, 43, 0.58)',
    700: 'rgba(3, 18, 40, 0.70)',
    800: 'rgba(0, 12, 30, 0.80)',
    900: 'rgba(2, 9, 19, 0.91)',
  },
};

/** 포트폴리오 보유 종목 최대 개수와 동일 */
export const CHART_PALETTE_SIZE = 20;

const CHART_COLOR_PALETTE: string[] = [
  colors.blue[500],
  colors.green[500],
  colors.orange[500],
  colors.red[500],
  colors.purple[500],
  colors.teal[500],
  colors.yellow[500],
  colors.blue[900],
  colors.green[900],
  colors.orange[900],
  colors.red[900],
  colors.purple[900],
  colors.teal[900],
  colors.yellow[900],
  colors.blue[400],
  colors.green[400],
  colors.orange[400],
  colors.red[400],
  colors.purple[400],
  colors.teal[400],
];

/**
 * 등락 및 감정(강점/리스크/관전) 시맨틱 색상.
 * 한국 시장 관례상 상승=빨강, 하락=파랑이며 light/dark 공통. Figma 기준값을 사용한다.
 */
export const sentimentColors = {
  up: colors.red[400], // #FF4444 상승
  down: colors.primary, // #466CFF 하락
  strength: colors.green[500], // #03b26c 강점
  risk: colors.red[400], // #FF4444 리스크
  watchpoint: '#f59e0c', // 관전 포인트(amber, 팔레트 외 디자인 전용)
  heartActive: colors.red[400], // #FF4444 관심 하트(활성)
  heartInactive: colors.gray[300], // #aaaaaa 관심 하트(비활성)
} as const;

/** 등락/감정 배지 배경(반투명). */
export const sentimentBgColors = {
  up: 'rgba(255, 68, 68, 0.1)',
  down: 'rgba(70, 108, 255, 0.1)',
  strength: 'rgba(3, 178, 108, 0.1)',
  risk: 'rgba(255, 68, 68, 0.1)',
  watchpoint: 'rgba(245, 158, 12, 0.1)',
} as const;

/** 차트 색상 팔레트 (최대 20색, 이후 순환) */
export function getChartColor(index: number): string {
  return CHART_COLOR_PALETTE[index % CHART_PALETTE_SIZE];
}

export const themeColors = {
  light: {
    background: colors.white,
    homebg: colors.homebg,
    foreground: colors.gray[900],

    card: colors.white,
    cardForeground: colors.gray[900],
    blackWhite: colors.black,
    blackWhiteForeground: colors.white,

    popover: colors.white,
    popoverForeground: colors.gray[900],

    primary: colors.primary,
    primaryForeground: colors.gray[50],

    secondary: colors.gray[50],
    secondaryForeground: colors.gray[900],

    muted: colors.gray[300],
    mutedForeground: colors.gray[500],

    accent: colors.gray[100],
    accentForeground: colors.gray[900],

    destructive: colors.red[500],
    destructiveForeground: colors.gray[50],

    border: colors.gray[100],
    input: colors.gray[200],
    ring: colors.gray[400],

    // Chart UI
    chartLabel: colors.gray[400],
    chartCurrentPriceLine: colors.gray[600],
    chartAxisLine: colors.gray[200],
    /** 막대 차트 0 기준선 — 축선보다 한 단계 또렷하게 */
    chartBaseline: colors.gray[300],
    chartGrid: colors.gray[100],
    chartGridInDualAxis: colors.gray[100],

    // Chart data
    chartPrimary: colors.blue[500],
    chartSecondary: colors.orange[500],
    chartVolumeUp: colors.red[500],
    chartVolumeDown: colors.blue[600],
    chartVolumeNeutral: colors.purple[500],
    chartVolumeUpMuted: '#F9B8BD',
    chartVolumeDownMuted: '#ABC9F7',
    chartVolumeNeutralMuted: '#DCB2EA',
    chartBarGradientStart: colors.blue[500],
    chartBarGradientEnd: '#4EA0FF',
    chartBar2GradientStart: colors.teal[400],
    chartBar2GradientEnd: colors.teal[100],
    chartPalette: getChartColor,
  },

  dark: {
    background: colors.gray[900],
    foreground: colors.gray[50],

    homebg: colors.black,
    card: colors.gray[800],
    cardForeground: colors.gray[50],
    blackWhite: colors.white,
    blackWhiteForeground: colors.black,

    popover: colors.gray[900],
    popoverForeground: colors.gray[50],

    primary: colors.primary,
    primaryForeground: colors.white,

    secondary: colors.gray[800],
    secondaryForeground: colors.gray[50],

    muted: colors.gray[600],
    mutedForeground: colors.gray[400],

    accent: colors.gray[700],
    accentForeground: colors.gray[50],

    destructive: colors.red[500],
    destructiveForeground: colors.gray[50],

    border: colors.gray[700],
    input: colors.gray[800],
    ring: colors.gray[500],

    // Chart UI
    chartLabel: colors.gray[400],
    chartCurrentPriceLine: colors.gray[200],
    chartAxisLine: colors.gray[700],
    /** 막대 차트 0 기준선 — 카드 배경(gray[800])에 묻히지 않도록 밝게 */
    chartBaseline: colors.gray[600],
    chartGrid: colors.gray[800],
    chartGridInDualAxis: colors.gray[700],

    // Chart data
    chartPrimary: colors.blue[500],
    chartSecondary: colors.orange[500],
    chartVolumeUp: colors.red[500],
    chartVolumeDown: colors.blue[600],
    chartVolumeNeutral: colors.purple[500],
    chartVolumeUpMuted: '#792B34',
    chartVolumeDownMuted: '#1C4079',
    chartVolumeNeutralMuted: '#562469',
    chartBarGradientStart: colors.blue[500],
    chartBarGradientEnd: '#7E98FF',
    chartBar2GradientStart: colors.teal[400],
    chartBar2GradientEnd: colors.teal[100],
    chartPalette: getChartColor,
  },
};
