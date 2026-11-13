import dayjs from 'dayjs';
import { CalendarDays } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppSwitch, Chip, Icon, Text } from '@/components/atoms';
import {
  DEFAULT_GOAL_REMIND,
  GOAL_REMIND_META,
  type GoalInfo,
  type GoalRemind,
} from '@/lib/bucket/types';
import { DATE_FORMAT } from '@/lib/date';

import { DatePickerSheet } from './DatePickerSheet';
import { goalDday } from './goalDday';

/** 목표 날짜는 먼 미래까지 고를 수 있다 */
const MAX_GOAL_DATE = '2099-12-31';
const REMIND_ORDER: GoalRemind[] = ['week', 'day', 'morning'];

type GoalFieldProps = {
  value: GoalInfo | null;
  onChange: (value: GoalInfo | null) => void;
};

/**
 * 목표 날짜 (선택). 스위치를 켜야 날짜와 알림 시점을 고를 수 있다.
 * 켜면 한 달 뒤로 시작하고, 알림은 하루 전·당일 아침이 기본.
 */
export function GoalField({ value, onChange }: GoalFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const toggle = (on: boolean) => {
    if (!on) {
      onChange(null);
      return;
    }
    onChange({
      date: dayjs().add(1, 'month').format(DATE_FORMAT),
      remind: DEFAULT_GOAL_REMIND,
    });
  };

  const toggleRemind = (key: GoalRemind) => {
    if (!value) return;
    const has = value.remind.includes(key);
    const remind = REMIND_ORDER.filter((k) =>
      k === key ? !has : value.remind.includes(k)
    );
    onChange({ ...value, remind });
  };

  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-3">
        <View className="flex-1 gap-0.5">
          <Text weight="600" size={15}>
            목표 날짜 정하기 (선택)
          </Text>
          <Text variant="muted" size={12}>
            정해두면 그날이 다가올 때 알려줘요
          </Text>
        </View>
        <AppSwitch
          accessibilityLabel="목표 날짜 정하기"
          value={value !== null}
          onValueChange={toggle}
        />
      </View>

      {value ? (
        <View className="gap-3 rounded-2xl p-4 bg-accent">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="목표 날짜 고르기"
            onPress={() => setPickerOpen(true)}
            className="h-12 flex-row items-center justify-center gap-2 rounded-xl bg-background active:opacity-70"
          >
            <Icon
              as={CalendarDays}
              size={16}
              className="text-muted-foreground"
            />
            <Text weight="600" size={16}>
              {dayjs(value.date).format('YYYY년 M월 D일 (dd)')}
            </Text>
            <Text weight="600" size={14} className="text-primary">
              {goalDday(value.date)}
            </Text>
          </Pressable>

          <View className="gap-2">
            <Text variant="muted" size={12}>
              알림 받을 때 (여러 개 고를 수 있어요)
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {REMIND_ORDER.map((key) => (
                <Chip
                  key={key}
                  label={GOAL_REMIND_META[key].label}
                  selected={value.remind.includes(key)}
                  onPress={() => toggleRemind(key)}
                />
              ))}
            </View>
            {value.remind.length === 0 ? (
              <Text variant="muted" size={12}>
                알림 없이 날짜만 표시해요
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      <DatePickerSheet
        visible={pickerOpen}
        value={value?.date ?? dayjs().format(DATE_FORMAT)}
        maxDate={MAX_GOAL_DATE}
        onChange={(date) => value && onChange({ ...value, date, until: null })}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}
