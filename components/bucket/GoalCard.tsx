import dayjs from 'dayjs';
import { CalendarPlus, Flag } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ActionSheet, Icon, Text } from '@/components/atoms';
import { goalDday } from '@/components/bucket/goalDday';
import { useGoalWeather } from '@/hooks/useGoalWeather';
import { goalEvent, goalLabel } from '@/lib/bucket/calendarEvent';
import { GOAL_REMIND_META, type BucketItem } from '@/lib/bucket/types';
import { openGoogleCalendar, shareIcs } from '@/lib/calendarShare';
import { showAlert } from '@/lib/dialog';
import type { DayWeather } from '@/lib/forecast';

/** 목표 날짜 카드: 날짜(기간)·알림·D-day, 날씨 예보, 캘린더에 넣기 */
export function GoalCard({ item }: { item: BucketItem }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const weather = useGoalWeather(item);
  const goal = item.goal;
  if (!goal) return null;
  const done = item.done;
  const event = goalEvent(item);

  const run = (task: () => Promise<void>) => () => {
    task().catch(() =>
      showAlert('캘린더에 넣지 못했어요', '잠시 뒤에 다시 해 주세요.')
    );
  };

  return (
    <View className="gap-3 rounded-2xl p-4 bg-accent">
      <View className="flex-row items-center gap-3">
        <Icon as={Flag} size={18} className="text-primary" />
        <View className="flex-1 gap-0.5">
          <Text weight="600" size={13} className="text-muted-foreground">
            목표 날짜
          </Text>
          <Text weight="600" size={15}>
            {goalLabel(goal)}
          </Text>
          <Text variant="muted" size={12}>
            {goal.remind.length > 0
              ? `알림: ${goal.remind.map((k) => GOAL_REMIND_META[k].label).join(', ')}`
              : '알림 없음'}
          </Text>
        </View>
        {!done ? (
          <Text weight="700" size={16} className="text-primary">
            {goalDday(goal.date)}
          </Text>
        ) : null}
      </View>

      {weather && weather.length > 0 ? <WeatherRow days={weather} /> : null}

      {!done && event ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setSheetOpen(true)}
          className="flex-row items-center justify-center gap-1.5 rounded-xl bg-background py-2.5 active:opacity-70"
        >
          <Icon as={CalendarPlus} size={16} className="text-primary" />
          <Text weight="600" size={13} className="text-primary">
            캘린더에 넣기
          </Text>
        </Pressable>
      ) : null}

      {event ? (
        <ActionSheet
          visible={sheetOpen}
          onClose={() => setSheetOpen(false)}
          header={
            <Text variant="muted" size={13} className="text-center">
              폰 캘린더에 종일 일정으로 넣어요
            </Text>
          }
          items={[
            {
              label: '구글 캘린더',
              onPress: run(() => openGoogleCalendar(event)),
            },
            {
              // 삼성·애플 캘린더 등 .ics 파일을 받는 앱
              label: '다른 캘린더 앱 (파일로 열기)',
              onPress: run(() => shareIcs(event, item.id)),
            },
          ]}
        />
      ) : null}
    </View>
  );
}

/** 정한 날(기간이면 날마다) 예보 */
function WeatherRow({ days }: { days: DayWeather[] }) {
  const single = days.length === 1;
  return (
    <View className="gap-1.5 rounded-xl bg-background px-3 py-2.5">
      <Text weight="600" size={12} className="text-muted-foreground">
        날씨 예보
      </Text>
      {days.map((d) => (
        <View key={d.date} className="flex-row items-center gap-2">
          {!single ? (
            <Text size={12} className="w-14 text-muted-foreground">
              {dayjs(d.date).format('M/D (dd)')}
            </Text>
          ) : null}
          <Text size={single ? 18 : 14}>{d.emoji}</Text>
          <Text weight="600" size={13} className="flex-1">
            {d.label}
          </Text>
          <Text size={13}>
            {d.max}° / {d.min}°
          </Text>
          {d.rain !== null ? (
            <Text size={12} className="w-12 text-right text-muted-foreground">
              ☔ {d.rain}%
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}
