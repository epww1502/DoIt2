// 설정에서 고를 수 있는 앱 테마색. 흰 글씨가 잘 보이도록 밝기를 맞춘 값들이다.
// tailwind.config.js도 이 파일을 읽는다 (기본값을 :root 변수로 넣을 때).

export type PaletteKey =
  'sky' | 'mint' | 'green' | 'pink' | 'purple' | 'orange';

export const PALETTES: { key: PaletteKey; label: string; hex: string }[] = [
  { key: 'sky', label: '하늘', hex: '#5AB0FF' },
  { key: 'mint', label: '민트', hex: '#20B8A6' },
  { key: 'green', label: '초록', hex: '#22B45A' },
  { key: 'pink', label: '분홍', hex: '#FF6B98' },
  { key: 'purple', label: '보라', hex: '#8B6CF6' },
  { key: 'orange', label: '주황', hex: '#FF8A34' },
];

export const DEFAULT_PALETTE: PaletteKey = 'sky';

export function paletteHex(key: PaletteKey) {
  return (PALETTES.find((p) => p.key === key) ?? PALETTES[0]).hex;
}

/** '#5AB0FF' → '90 176 255' (CSS 변수 rgb(var(--color-primary) / a)에 넣는 모양) */
export function hexToRgbTriple(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}
