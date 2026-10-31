import dayjs from 'dayjs';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip, Segmented, Text } from '@/components/atoms';
import {
  getCategory,
  type BucketItem,
  type BucketSetting,
  type CategoryKey,
} from '@/lib/bucket/types';

import { StarRating } from './StarRating';

/** 함께한 것 목록 필터 */
export type DoneFilter = {
  /** 기록한 해. null이면 전체 */
  year: number | null;
  /** 고른 카테고리들. 비어 있으면 전체 */
  categories: CategoryKey[];
  setting: 'all' | BucketSetting;
  /** 이 별점 이상만. 1이면 전체 */
  minRating: number;
};

export const EMPTY_DONE_FILTER: DoneFilter = {
  year: null,
  categories: [],
  setting: 'all',
  minRating: 1,
};

/** 켜져 있는 조건 수 (필터 버튼에 숫자로 보여준다) */
export function activeFilterCount(f: DoneFilter) {
  return (
    (f.year !== null ? 1 : 0) +
    (f.categories.length > 0 ? 1 : 0) +
    (f.setting !== 'all' ? 1 : 0) +
    (f.minRating > 1 ? 1 : 0)
  );
}

export function matchesDoneFilter(item: BucketItem, f: DoneFilter) {
  const done = item.done;
  if (!done) return false;
  if (f.year !== null && dayjs(done.date).year() !== f.year) return false;
  if (f.categories.length > 0 && !f.categories.includes(item.category)) {
    return false;
  }
  if (f.setting !== 'all' && item.setting !== f.setting) return false;
  return f.minRating <= 1 || done.rating >= f.minRating;
}

const SETTING_OPTIONS: { value: DoneFilter['setting']; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'indoor', label: '실내' },
  { value: 'outdoor', label: '실외' },
];

type DoneFilterSheetProps = {
  visible: boolean;
  /** 고를 수 있는 연도·카테고리를 뽑을 기록들 (종류 고르기까지 적용된 목록) */
  items: BucketItem[];
  value: DoneFilter;
  onApply: (next: DoneFilter) => void;
  onClose: () => void;
};

/** 아래에서 올라오는 필터 시트. '보기'를 눌러야 목록에 반영된다 */
export function DoneFilterSheet(props: DoneFilterSheetProps) {
  return (
    <Modal
      visible={props.visible}
      transparent
      animationType="slide"
      onRequestClose={props.onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {/* 열 때마다 지금 필터에서 다시 시작하려고 열려 있을 때만 그린다 */}
      {props.visible ? <SheetBody {...props} /> : null}
    </Modal>
  );
}

function SheetBody({ items, value, onApply, onClose }: DoneFilterSheetProps) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<DoneFilter>(value);

  // 기록이 있는 해와 카테고리만 고를 수 있게
  const years = [
    ...new Set(items.map((it) => dayjs(it.done!.date).year())),
  ].sort((a, b) => b - a);
  const categories = [...new Set(items.map((it) => it.category))];
  const resultCount = items.filter((it) => matchesDoneFilter(it, draft)).length;

  const toggleCategory = (key: CategoryKey) =>
    setDraft((d) => ({
      ...d,
      categories: d.categories.includes(key)
        ? d.categories.filter((k) => k !== key)
        : [...d.categories, key],
    }));

  return (
    <View className="flex-1 justify-end">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="닫기"
        onPress={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <View
        className="max-h-[85%] rounded-t-3xl bg-background pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <View className="mb-2 h-1 w-10 self-center rounded-full bg-border" />
        <Text weight="700" size={18} className="px-5 pb-2">
          필터
        </Text>
        <ScrollView contentContainerClassName="gap-6 px-5 pb-4 pt-2">
          <FilterSection title="언제">
            <View className="flex-row flex-wrap gap-2">
              <Chip
                label="전체"
                selected={draft.year === null}
                onPress={() => setDraft((d) => ({ ...d, year: null }))}
              />
              {years.map((y) => (
                <Chip
                  key={y}
                  label={`${y}년`}
                  selected={draft.year === y}
                  onPress={() => setDraft((d) => ({ ...d, year: y }))}
                />
              ))}
            </View>
          </FilterSection>

          <FilterSection title="카테고리 (여러 개 고를 수 있어요)">
            <View className="flex-row flex-wrap gap-2">
              <Chip
                label="전체"
                selected={draft.categories.length === 0}
                onPress={() => setDraft((d) => ({ ...d, categories: [] }))}
              />
              {categories.map((key) => {
                const c = getCategory(key);
                return (
                  <Chip
                    key={key}
                    label={c.label}
                    emoji={c.emoji}
                    selected={draft.categories.includes(key)}
                    onPress={() => toggleCategory(key)}
                  />
                );
              })}
            </View>
          </FilterSection>

          <FilterSection title="실내 · 실외">
            <Segmented
              options={SETTING_OPTIONS}
              value={draft.setting}
              onChange={(setting) => setDraft((d) => ({ ...d, setting }))}
            />
          </FilterSection>

          <FilterSection title="최소 별점">
            <View className="flex-row items-center gap-3">
              <StarRating
                value={draft.minRating}
                onChange={(minRating) => setDraft((d) => ({ ...d, minRating }))}
                size={28}
              />
              <Text variant="muted" size={13}>
                {draft.minRating <= 1
                  ? '전체'
                  : draft.minRating === 5
                    ? '5점만'
                    : `${draft.minRating}점 이상`}
              </Text>
            </View>
          </FilterSection>
        </ScrollView>

        <View className="flex-row gap-2 border-t border-border px-5 pt-3">
          <Pressable
            accessibilityRole="button"
            onPress={() => setDraft(EMPTY_DONE_FILTER)}
            className="h-12 items-center justify-center rounded-xl px-5 bg-accent active:opacity-70"
          >
            <Text weight="600" size={15} className="text-muted-foreground">
              초기화
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onApply(draft);
              onClose();
            }}
            className="h-12 flex-1 items-center justify-center rounded-xl bg-primary active:opacity-70"
          >
            <Text weight="600" size={15} className="text-primary-foreground">
              {`${resultCount}개 보기`}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-3">
      <Text weight="600" size={14} className="text-muted-foreground">
        {title}
      </Text>
      {children}
    </View>
  );
}
