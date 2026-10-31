// 테마색을 아주 살짝 섞은 배경·카드·테두리 색.
// 설정에서 테마색을 바꾸면 화면 바탕도 같은 톤으로 함께 바뀐다.
// tailwind.config.js도 이 파일을 읽는다 (기본 테마색의 값을 :root 변수로 넣을 때).
// 그래서 '@/...' 경로 없이 이 파일만으로 동작해야 한다.

export type ThemeSurface = {
  /** 화면 바탕 */
  background: string;
  /** 카드·입력칸·탭바 바탕 */
  card: string;
  /** 카드 테두리 */
  border: string;
  /** 점선 테두리·흐린 선 */
  muted: string;
  /** 입력칸 테두리 */
  input: string;
};

function toRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]) {
  return `#${[r, g, b]
    .map((v) => Math.round(v).toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();
}

/** base에 tint를 amount(0~1)만큼 섞는다 */
export function mixHex(base: string, tint: string, amount: number) {
  const a = toRgb(base);
  const b = toRgb(tint);
  return toHex([
    a[0] + (b[0] - a[0]) * amount,
    a[1] + (b[1] - a[1]) * amount,
    a[2] + (b[2] - a[2]) * amount,
  ]);
}

export function themeSurface(
  primary: string,
  scheme: 'light' | 'dark'
): ThemeSurface {
  if (scheme === 'dark') {
    return {
      background: mixHex('#141416', primary, 0.06),
      card: mixHex('#1E1E22', primary, 0.08),
      border: mixHex('#2E2E34', primary, 0.14),
      muted: mixHex('#55555C', primary, 0.14),
      input: mixHex('#2E2E34', primary, 0.14),
    };
  }
  return {
    background: mixHex('#FFFFFF', primary, 0.06),
    card: '#FFFFFF',
    border: mixHex('#EEEBE8', primary, 0.16),
    muted: mixHex('#D9D4CF', primary, 0.22),
    input: mixHex('#E4E0DC', primary, 0.18),
  };
}

/** '#5AB0FF' → '90 176 255' (CSS 변수 rgb(var(--x) / a)에 넣는 모양) */
export function surfaceVars(surface: ThemeSurface): Record<string, string> {
  const triple = (hex: string) => toRgb(hex).join(' ');
  return {
    '--color-bg': triple(surface.background),
    '--color-card': triple(surface.card),
    '--color-border': triple(surface.border),
    '--color-muted': triple(surface.muted),
    '--color-input': triple(surface.input),
  };
}
