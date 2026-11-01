import type { CategoryKey } from '@/lib/bucket/types';

/** 카테고리 아이콘 동그라미의 파스텔 배경·점선 테두리·아이콘 선 색 */
export type CategoryTint = { bg: string; border: string; fg: string };

export type Ramp = { light: CategoryTint; dark: CategoryTint };

export const PINK: Ramp = {
  light: { bg: '#FBEAF0', border: '#ED93B1', fg: '#993556' },
  dark: { bg: '#4B1528', border: '#993556', fg: '#F4C0D1' },
};
export const AMBER: Ramp = {
  light: { bg: '#FAEEDA', border: '#EF9F27', fg: '#854F0B' },
  dark: { bg: '#412402', border: '#854F0B', fg: '#FAC775' },
};
export const TEAL: Ramp = {
  light: { bg: '#E1F5EE', border: '#5DCAA5', fg: '#0F6E56' },
  dark: { bg: '#04342C', border: '#0F6E56', fg: '#9FE1CB' },
};
export const BLUE: Ramp = {
  light: { bg: '#E6F1FB', border: '#85B7EB', fg: '#185FA5' },
  dark: { bg: '#042C53', border: '#185FA5', fg: '#B5D4F4' },
};
export const PURPLE: Ramp = {
  light: { bg: '#EEEDFE', border: '#AFA9EC', fg: '#534AB7' },
  dark: { bg: '#26215C', border: '#534AB7', fg: '#CECBF6' },
};
export const CORAL: Ramp = {
  light: { bg: '#FAECE7', border: '#F0997B', fg: '#993C1D' },
  dark: { bg: '#4A1B0C', border: '#993C1D', fg: '#F5C4B3' },
};
export const GREEN: Ramp = {
  light: { bg: '#EAF3DE', border: '#97C459', fg: '#3B6D11' },
  dark: { bg: '#173404', border: '#3B6D11', fg: '#C0DD97' },
};
export const CREAM: Ramp = {
  light: { bg: '#FFF1E2', border: '#EAD6C2', fg: '#6E5240' },
  dark: { bg: '#3A2F27', border: '#6E5240', fg: '#EAD6C2' },
};

const CATEGORY_RAMP: Record<CategoryKey, Ramp> = {
  food: PINK,
  cafe: AMBER,
  trip: TEAL,
  activity: BLUE,
  culture: PURPLE,
  cook: CORAL,
  exercise: GREEN,
  hobby: PURPLE,
  memory: PINK,
  event: AMBER,
  etc: CREAM,
};

export function categoryTint(
  key: CategoryKey,
  scheme: 'light' | 'dark'
): CategoryTint {
  return (CATEGORY_RAMP[key] ?? CREAM)[scheme];
}
