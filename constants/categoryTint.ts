import type { CategoryKey } from '@/lib/bucket/types';

/** 카테고리 아이콘 동그라미의 파스텔 배경·점선 테두리 색 */
export type CategoryTint = { bg: string; border: string };

type Ramp = { light: CategoryTint; dark: CategoryTint };

const PINK: Ramp = {
  light: { bg: '#FBEAF0', border: '#ED93B1' },
  dark: { bg: '#4B1528', border: '#993556' },
};
const AMBER: Ramp = {
  light: { bg: '#FAEEDA', border: '#EF9F27' },
  dark: { bg: '#412402', border: '#854F0B' },
};
const TEAL: Ramp = {
  light: { bg: '#E1F5EE', border: '#5DCAA5' },
  dark: { bg: '#04342C', border: '#0F6E56' },
};
const BLUE: Ramp = {
  light: { bg: '#E6F1FB', border: '#85B7EB' },
  dark: { bg: '#042C53', border: '#185FA5' },
};
const PURPLE: Ramp = {
  light: { bg: '#EEEDFE', border: '#AFA9EC' },
  dark: { bg: '#26215C', border: '#534AB7' },
};
const CORAL: Ramp = {
  light: { bg: '#FAECE7', border: '#F0997B' },
  dark: { bg: '#4A1B0C', border: '#993C1D' },
};
const GREEN: Ramp = {
  light: { bg: '#EAF3DE', border: '#97C459' },
  dark: { bg: '#173404', border: '#3B6D11' },
};
const CREAM: Ramp = {
  light: { bg: '#FFF1E2', border: '#EAD6C2' },
  dark: { bg: '#3A2F27', border: '#6E5240' },
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
