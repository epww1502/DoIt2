/**
 * 홈 화면 앱 아이콘 고르기 (새 빌드부터). 아이콘은 앱에 미리 넣어 둔 그림 중에서만 바꿀 수 있어서,
 * 고르는 화면은 조합처럼 보여도 실제로는 아래 19개 중 하나를 고르는 것이다 (assets/icons, app.json의 플러그인).
 *
 * - 글자(Doit²) + 색 바탕: 흰 글씨. 6개 (하늘이 기본 아이콘)
 * - 글자 + 밤색 바탕: 색 글씨. 6개
 * - 캐릭터(하트 두 개) + 색 바탕 6개, 밤색 바탕 1개
 */
import { requireOptionalNativeModule } from 'expo';

import { PALETTES, type PaletteKey } from '@/constants/palettes';

export type IconStyle = 'text' | 'char';
export type IconBackground = PaletteKey | 'night';

export type IconChoice = {
  style: IconStyle;
  background: IconBackground;
  /** 글자 모양에 밤색 바탕일 때만 쓰는 글자색 */
  textColor: PaletteKey;
};

export const DEFAULT_ICON: IconChoice = {
  style: 'text',
  background: 'sky',
  textColor: 'sky',
};

const isPalette = (key: string): key is PaletteKey =>
  PALETTES.some((p) => p.key === key);

/** 글자색을 고를 수 있는 조합인지 (글자 모양 + 밤색 바탕) */
export function canPickTextColor(choice: IconChoice) {
  return choice.style === 'text' && choice.background === 'night';
}

/**
 * 고른 조합의 아이콘 이름 (app.json에 등록한 이름). 기본 아이콘이면 null.
 * 글자색은 고를 수 없는 조합에서는 무시한다.
 */
export function iconName(choice: IconChoice): string | null {
  if (choice.style === 'char') return `char_${choice.background}`;
  if (choice.background === 'night') return `text_dark_${choice.textColor}`;
  return choice.background === 'sky' ? null : `text_light_${choice.background}`;
}

/** 아이콘 이름에서 조합으로 (지금 아이콘을 고르기 화면에 표시할 때). 모르는 이름이면 기본 */
export function choiceFromIconName(
  name: string | null | undefined
): IconChoice {
  if (!name) return DEFAULT_ICON;
  const [style, a, b] = name.split('_');
  if (style === 'char' && (a === 'night' || isPalette(a))) {
    return { style: 'char', background: a, textColor: DEFAULT_ICON.textColor };
  }
  if (style === 'text' && a === 'dark' && b && isPalette(b)) {
    return { style: 'text', background: 'night', textColor: b };
  }
  if (style === 'text' && a === 'light' && b && isPalette(b)) {
    return { style: 'text', background: b, textColor: b };
  }
  return DEFAULT_ICON;
}

/** 등록해야 하는 아이콘 이름 전부 (기본 아이콘 빼고 18개). app.json과 맞는지 테스트에서 본다 */
export function allIconNames(): string[] {
  const names = new Set<string>();
  const backgrounds: IconBackground[] = [
    ...PALETTES.map((p) => p.key),
    'night',
  ];
  for (const style of ['text', 'char'] as const) {
    for (const background of backgrounds) {
      for (const p of PALETTES) {
        const name = iconName({ style, background, textColor: p.key });
        if (name) names.add(name);
      }
    }
  }
  return [...names].sort();
}

/** 이 빌드에서 아이콘을 바꿀 수 있는지 */
export function appIconAvailable() {
  return requireOptionalNativeModule('ExpoAppIcon') !== null;
}

/** 지금 홈 화면 아이콘의 조합 */
export async function currentIconChoice(): Promise<IconChoice> {
  if (!appIconAvailable()) return DEFAULT_ICON;
  const AppIcon = await import('expo-quick-actions/icon');
  return choiceFromIconName(await AppIcon.getIcon?.());
}

/**
 * 안드로이드에서 홈 화면에 켜져 있는 앱 아이콘 수 (0.3.1 빌드부터). 2 이상이면 옛 버전에서 아이콘이 늘어난 것이다.
 * 아이폰이거나 이 기능이 없는 빌드면 null.
 */
export async function enabledIconCount(): Promise<number | null> {
  const native = requireOptionalNativeModule<{
    enabledIconCount?: () => Promise<number>;
  }>('ExpoAppIcon');
  if (!native?.enabledIconCount) return null;
  try {
    return await native.enabledIconCount();
  } catch {
    return null;
  }
}

/** 홈 화면 아이콘을 바꾼다. 안드로이드는 바꾼 뒤 앱이 닫힌다 */
export async function applyIconChoice(choice: IconChoice) {
  const AppIcon = await import('expo-quick-actions/icon');
  if (!AppIcon.setIcon) throw new Error('app icon not supported');
  await AppIcon.setIcon(iconName(choice));
}
