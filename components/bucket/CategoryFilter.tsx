import { ScrollView, View } from 'react-native';

import { Chip, Segmented } from '@/components/atoms';
import {
  CATEGORIES_BY_KIND,
  KIND_META,
  type BucketItem,
  type BucketKind,
  type CategoryKey,
} from '@/lib/bucket/types';

export type BucketFilter = {
  /** null이면 전체 */
  kind: BucketKind | null;
  /** null이면 전체. kind가 있을 때만 쓴다 */
  category: CategoryKey | null;
};

export const ALL_FILTER: BucketFilter = { kind: null, category: null };

export function matchesFilter(item: BucketItem, filter: BucketFilter) {
  if (filter.kind && item.kind !== filter.kind) return false;
  if (filter.category && item.category !== filter.category) return false;
  return true;
}

type KindOption = 'all' | BucketKind;

const KIND_OPTIONS: { value: KindOption; label: string }[] = [
  { value: 'all', label: '전체' },
  {
    value: 'place',
    label: `${KIND_META.place.emoji} ${KIND_META.place.label}`,
  },
  {
    value: 'activity',
    label: `${KIND_META.activity.emoji} ${KIND_META.activity.label}`,
  },
];

type CategoryFilterProps = {
  value: BucketFilter;
  onChange: (value: BucketFilter) => void;
};

/** 전체 / 갈 곳 / 할 것 + (종류를 고르면) 카테고리 칩 */
export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  return (
    <View className="gap-3">
      <View className="px-5">
        <Segmented
          options={KIND_OPTIONS}
          value={value.kind ?? 'all'}
          onChange={(next) =>
            onChange({ kind: next === 'all' ? null : next, category: null })
          }
        />
      </View>
      {value.kind ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 px-5"
          className="grow-0"
        >
          <Chip
            label="전체"
            selected={value.category === null}
            onPress={() => onChange({ ...value, category: null })}
          />
          {CATEGORIES_BY_KIND[value.kind].map((c) => (
            <Chip
              key={c.key}
              label={`${c.emoji} ${c.label}`}
              selected={value.category === c.key}
              onPress={() => onChange({ ...value, category: c.key })}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}
