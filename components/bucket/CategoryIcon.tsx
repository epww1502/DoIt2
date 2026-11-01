import { CATEGORY_ICON } from '@/constants/categoryIcon';
import { categoryTint } from '@/constants/categoryTint';
import { useThemeMode } from '@/contexts/ThemeModeContext';
import type { CategoryKey } from '@/lib/bucket/types';

type CategoryIconProps = {
  category: CategoryKey;
  size: number;
  /** 선 색. 기본은 그 카테고리의 진한 파스텔 색 */
  color?: string;
};

/** 카테고리 선 아이콘 (이모지 대신) */
export function CategoryIcon({ category, size, color }: CategoryIconProps) {
  const { colorScheme } = useThemeMode();
  const Icon = CATEGORY_ICON[category] ?? CATEGORY_ICON.etc;
  return (
    <Icon
      size={size}
      color={color ?? categoryTint(category, colorScheme).fg}
      strokeWidth={size >= 32 ? 1.75 : 2}
    />
  );
}
