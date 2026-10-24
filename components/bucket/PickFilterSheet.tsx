import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppSwitch, Segmented, Text } from '@/components/atoms';
import type { BucketSetting } from '@/lib/bucket/types';

import { StarRating } from './StarRating';

/** 뽑기 조건 */
export type PickFilter = {
  setting: 'all' | BucketSetting;
  /** 이미 해본 것도 뽑기 */
  includeDone: boolean;
  /** 해본 것은 이 별점 이상만 (1이면 전체) */
  minRating: number;
  /** 비 오는 곳의 실외도 뽑기 */
  includeOutdoor: boolean;
};

/** 기본값과 다른 조건 수 (필터 버튼 배지) */
export function activePickFilterCount(f: PickFilter) {
  return (
    (f.setting !== 'all' ? 1 : 0) +
    (f.includeDone ? 1 : 0) +
    (f.includeOutdoor ? 1 : 0)
  );
}

/** 켜진 조건을 한 줄로 ("실내 · 해본 것도 (4점 이상)") */
export function pickFilterSummary(f: PickFilter) {
  const parts: string[] = [];
  if (f.setting !== 'all')
    parts.push(f.setting === 'indoor' ? '실내만' : '실외만');
  if (f.includeDone) {
    parts.push(
      f.minRating > 1 ? `해본 것도 (${f.minRating}점 이상)` : '해본 것도'
    );
  }
  if (f.includeOutdoor) parts.push('비 와도 실외');
  return parts.join(' · ');
}

const SETTING_OPTIONS: { value: PickFilter['setting']; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'indoor', label: '실내' },
  { value: 'outdoor', label: '실외' },
];

const DEFAULT: PickFilter = {
  setting: 'all',
  includeDone: false,
  minRating: 1,
  includeOutdoor: false,
};

type PickFilterSheetProps = {
  visible: boolean;
  value: PickFilter;
  /** 오늘 비 때문에 뺄 실외가 있을 때만 '비 와도 실외 포함'을 보여준다 */
  rainMatters: boolean;
  onApply: (next: PickFilter) => void;
  onClose: () => void;
};

/** 뽑기 필터 시트. '적용하기'를 눌러야 반영된다 */
export function PickFilterSheet(props: PickFilterSheetProps) {
  return (
    <Modal
      visible={props.visible}
      transparent
      animationType="slide"
      onRequestClose={props.onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {/* 열 때마다 지금 조건에서 다시 시작하려고 열려 있을 때만 그린다 */}
      {props.visible ? <SheetBody {...props} /> : null}
    </Modal>
  );
}

function SheetBody({
  value,
  rainMatters,
  onApply,
  onClose,
}: PickFilterSheetProps) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<PickFilter>(value);
  const patch = (next: Partial<PickFilter>) =>
    setDraft((d) => ({ ...d, ...next }));

  return (
    <View className="flex-1 justify-end">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="닫기"
        onPress={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <View
        className="max-h-[85%] rounded-t-3xl pt-3 bg-background"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <View className="mb-2 h-1 w-10 self-center rounded-full bg-border" />
        <Text weight="700" size={18} className="px-5 pb-2">
          뽑기 조건
        </Text>
        <ScrollView contentContainerClassName="gap-6 px-5 pb-4 pt-2">
          <View className="gap-3">
            <Text weight="600" size={14} className="text-muted-foreground">
              실내 · 실외
            </Text>
            <Segmented
              options={SETTING_OPTIONS}
              value={draft.setting}
              onChange={(setting) => patch({ setting })}
            />
          </View>

          <View className="gap-3">
            <SwitchRow
              title="이미 해본 것도 포함"
              description="함께한 것 중에서도 다시 뽑아요"
              value={draft.includeDone}
              onChange={(includeDone) => patch({ includeDone })}
            />
            {draft.includeDone ? (
              <View className="flex-row items-center justify-between">
                <Text size={13} className="text-muted-foreground">
                  최소 별점
                </Text>
                <StarRating
                  value={draft.minRating}
                  onChange={(minRating) => patch({ minRating })}
                  size={22}
                />
              </View>
            ) : null}
          </View>

          {rainMatters ? (
            <SwitchRow
              title="비 와도 실외 포함"
              description="오늘 비 오는 곳의 실외 항목도 뽑아요"
              value={draft.includeOutdoor}
              onChange={(includeOutdoor) => patch({ includeOutdoor })}
            />
          ) : null}
        </ScrollView>

        <View className="flex-row gap-2 border-t px-5 pt-3 border-border">
          <Pressable
            accessibilityRole="button"
            onPress={() => setDraft({ ...DEFAULT, minRating: draft.minRating })}
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
              적용하기
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function SwitchRow({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="flex-1 gap-0.5">
        <Text weight="600" size={15}>
          {title}
        </Text>
        <Text variant="muted" size={12}>
          {description}
        </Text>
      </View>
      <AppSwitch
        accessibilityLabel={title}
        value={value}
        onValueChange={onChange}
      />
    </View>
  );
}
