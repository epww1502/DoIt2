import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { Chip, Segmented } from '@/components/atoms';
import {
  CATEGORIES_BY_KIND,
  KIND_META,
  type BucketItem,
  type BucketKind,
  type CategoryKey,
} from '@/lib/bucket/types';
import { KIND_ICON } from '@/components/bucket/kindIcons';
import type { SegmentedOption } from '@/components/atoms/Segmented';

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

const KIND_OPTIONS: SegmentedOption<KindOption>[] = [
  { value: 'all', label: '전체' },
  {
    value: 'place',
    label: KIND_META.place.label,
    icon: KIND_ICON.place,
  },
  {
    value: 'activity',
    label: KIND_META.activity.label,
    icon: KIND_ICON.activity,
  },
];

type CategoryFilterProps = {
  value: BucketFilter;
  onChange: (value: BucketFilter) => void;
  /** 종류 고르기 오른쪽에 붙일 버튼 (보기 방식 등) */
  right?: ReactNode;
};

/** 전체 / 가보기 / 해보기 + (종류를 고르면) 카테고리 칩 */
export function CategoryFilter({
  value,
  onChange,
  right,
}: CategoryFilterProps) {
  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-2 px-5">
        <View className="flex-1">
          <Segmented
            options={KIND_OPTIONS}
            value={value.kind ?? 'all'}
            onChange={(next) =>
              onChange({ kind: next === 'all' ? null : next, category: null })
            }
          />
        </View>
        {right}
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
              emoji={c.emoji}
              category={c.key}
              label={c.label}
              selected={value.category === c.key}
              onPress={() => onChange({ ...value, category: c.key })}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}
