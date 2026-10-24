import { ScrollView } from 'react-native';

import { Chip } from '@/components/atoms';
import { CATEGORIES, type CategoryKey } from '@/lib/place/types';

type CategoryFilterProps = {
  /** null이면 전체 */
  value: CategoryKey | null;
  onChange: (value: CategoryKey | null) => void;
};

/** 가로 스크롤 카테고리 칩 ('전체' 포함) */
export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-5"
      className="grow-0"
    >
      <Chip
        label="전체"
        selected={value === null}
        onPress={() => onChange(null)}
      />
      {CATEGORIES.map((c) => (
        <Chip
          key={c.key}
          label={`${c.emoji} ${c.label}`}
          selected={value === c.key}
          onPress={() => onChange(c.key)}
        />
      ))}
    </ScrollView>
  );
}
