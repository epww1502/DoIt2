import dayjs from 'dayjs';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { NavBar, Text } from '@/components/atoms';
import { CategoryIcon } from '@/components/bucket/CategoryIcon';
import { DatePickerSheet } from '@/components/bucket/DatePickerSheet';
import { EmptyState } from '@/components/bucket/EmptyState';
import { goalDday } from '@/components/bucket/goalDday';
import { SyncEmpty, useListSync } from '@/components/bucket/SyncNotice';
import { useGoalWeather } from '@/hooks/useGoalWeather';
import { goalEnd } from '@/lib/bucket/calendarEvent';
import type { BucketItem } from '@/lib/bucket/types';
import { buildUpcoming } from '@/lib/bucket/upcoming';
import { todayKey } from '@/lib/date';
import { cn } from '@/lib/utils';
import { useBucketStore } from '@/store/useBucketStore';

/** 목표 날짜는 먼 미래까지 고를 수 있다 */
const MAX_GOAL_DATE = '2099-12-31';

/** '11월 17일 (화)' 또는 '11월 17일 (화) ~ 20일 (금)'. 올해가 아니면 연도도 */
function shortGoalLabel(item: BucketItem) {
  const goal = item.goal!;
  const start = dayjs(goal.date);
  const fmt = start.isSame(dayjs(), 'year')
    ? 'M월 D일 (dd)'
    : 'YYYY년 M월 D일 (dd)';
  const end = goalEnd(goal);
  if (end === goal.date) return start.format(fmt);
  const last = dayjs(end);
  return `${start.format(fmt)} ~ ${last.format(
    last.isSame(start, 'month') ? 'D일 (dd)' : 'M월 D일 (dd)'
  )}`;
}

/** 다가오는 일정: 목표 날짜가 잡힌 것들을 날짜순으로 */
export default function UpcomingScreen() {
  const items = useBucketStore((s) => s.items);
  const updateItem = useBucketStore((s) => s.updateItem);
  const sync = useListSync();
  const insets = useSafeAreaInsets();
  const today = todayKey();
  const upcoming = useMemo(() => buildUpcoming(items, today), [items, today]);
  // 날짜를 다시 잡는 중인 (지난) 항목
  const [redating, setRedating] = useState<BucketItem | null>(null);

  if (upcoming.total === 0) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <NavBar title="다가오는 일정" />
        {sync.kind !== 'ok' ? (
          <SyncEmpty sync={sync} />
        ) : (
          <EmptyState
            emoji="🗓️"
            title="아직 잡힌 일정이 없어요"
            description="항목에 목표 날짜를 정하면 여기에 날짜순으로 모여요."
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar title="다가오는 일정" />
      <ScrollView
        contentContainerClassName="gap-6 px-5 pt-2"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {upcoming.groups.map((group) => (
          <View key={group.key} className="gap-2">
            <Text weight="700" size={15}>
              {group.label} · {group.items.length}
            </Text>
            {group.items.map((item) => (
              <UpcomingRow key={item.id} item={item} />
            ))}
          </View>
        ))}

        {upcoming.overdue.length > 0 ? (
          <View className="gap-2">
            <Text weight="700" size={15}>
              날짜가 지났어요 · {upcoming.overdue.length}
            </Text>
            <Text variant="muted" size={12}>
              다녀왔으면 기록을 남기고, 못 갔으면 날짜를 다시 잡아 봐요.
            </Text>
            {upcoming.overdue.map((item) => (
              <UpcomingRow
                key={item.id}
                item={item}
                overdue
                onRedate={() => setRedating(item)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <DatePickerSheet
        visible={!!redating}
        value={today}
        maxDate={MAX_GOAL_DATE}
        onChange={() => {}}
        onRangeChange={(date, until) => {
          if (redating?.goal) {
            updateItem(redating.id, {
              goal: { ...redating.goal, date, until },
            });
          }
        }}
        onClose={() => setRedating(null)}
      />
    </SafeAreaView>
  );
}

function UpcomingRow({
  item,
  overdue,
  onRedate,
}: {
  item: BucketItem;
  overdue?: boolean;
  onRedate?: () => void;
}) {
  const weather = useGoalWeather(overdue ? undefined : item);
  const first = weather?.[0];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        router.push({ pathname: '/item/[id]', params: { id: item.id } })
      }
      className="gap-2.5 rounded-2xl p-4 bg-accent active:opacity-80"
    >
      <View className="flex-row items-center gap-3">
        <CategoryIcon category={item.category} size={20} />
        <View className="flex-1 gap-0.5">
          <Text weight="600" size={15} numberOfLines={1}>
            {item.title}
          </Text>
          <Text variant="muted" size={12} numberOfLines={1}>
            {shortGoalLabel(item)}
            {item.place?.name ? ` · ${item.place.name}` : ''}
          </Text>
        </View>
        <View className="items-end gap-0.5">
          <Text
            weight="700"
            size={15}
            className={cn(overdue ? 'text-muted-foreground' : 'text-primary')}
          >
            {goalDday(item.goal!.date)}
          </Text>
          {first ? (
            <Text size={12} className="text-muted-foreground">
              {first.emoji} {first.max}° / {first.min}°
            </Text>
          ) : null}
        </View>
      </View>

      {overdue ? (
        <View className="flex-row gap-2">
          <RowButton label="날짜 다시 잡기" onPress={onRedate} />
          <RowButton
            label="기록 남기기"
            primary
            onPress={() =>
              router.push({ pathname: '/record/[id]', params: { id: item.id } })
            }
          />
        </View>
      ) : null}
    </Pressable>
  );
}

function RowButton({
  label,
  primary,
  onPress,
}: {
  label: string;
  primary?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        'flex-1 items-center rounded-xl py-2.5 active:opacity-70',
        primary ? 'bg-primary' : 'bg-background'
      )}
    >
      <Text
        weight="600"
        size={13}
        className={primary ? 'text-primary-foreground' : 'text-primary'}
      >
        {label}
      </Text>
    </Pressable>
  );
}
