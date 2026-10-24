import dayjs, { type Dayjs } from 'dayjs';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon, Text } from '@/components/atoms';
import { DATE_FORMAT } from '@/lib/date';
import { cn } from '@/lib/utils';

/** 일 → 월 → 연: 제목을 누를 때마다 한 단계 넓게 본다 */
type CalendarView = 'day' | 'month' | 'year';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
/** 연도 화면에 한 번에 보여줄 개수 (3열 × 4줄) */
const YEARS_PER_PAGE = 12;

type DatePickerSheetProps = {
  visible: boolean;
  /** YYYY-MM-DD */
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  /** 이 날짜 이후는 고를 수 없다 (YYYY-MM-DD). 기본은 오늘 */
  maxDate?: string;
};

/** 아래에서 올라오는 달력. 날짜를 고르면 닫힌다 */
export function DatePickerSheet({
  visible,
  value,
  onChange,
  onClose,
  maxDate,
}: DatePickerSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {/* 열릴 때마다 새로 그려서 고른 날짜의 달에서 시작한다 */}
      {visible ? (
        <Calendar
          value={value}
          maxDate={maxDate}
          onClose={onClose}
          onSelect={(next) => {
            onChange(next);
            onClose();
          }}
        />
      ) : null}
    </Modal>
  );
}

type CalendarProps = {
  value: string;
  maxDate?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
};

function Calendar({ value, maxDate, onSelect, onClose }: CalendarProps) {
  const insets = useSafeAreaInsets();
  const selected = dayjs(value);
  const max = dayjs(maxDate ?? dayjs().format(DATE_FORMAT)).endOf('day');

  const [view, setView] = useState<CalendarView>('day');
  /** 지금 보고 있는 달 (월 화면에서는 그 해, 연 화면에서는 그 연도가 들어 있는 묶음) */
  const [cursor, setCursor] = useState<Dayjs>(selected.startOf('month'));

  const yearPageStart =
    Math.floor(cursor.year() / YEARS_PER_PAGE) * YEARS_PER_PAGE;

  const title =
    view === 'day'
      ? cursor.format('YYYY년 M월')
      : view === 'month'
        ? cursor.format('YYYY년')
        : `${yearPageStart}년 ~ ${yearPageStart + YEARS_PER_PAGE - 1}년`;

  const move = (dir: -1 | 1) => {
    if (view === 'day') setCursor(cursor.add(dir, 'month'));
    else if (view === 'month') setCursor(cursor.add(dir, 'year'));
    else setCursor(cursor.add(dir * YEARS_PER_PAGE, 'year'));
  };

  // 다음으로 넘어갈 칸이 전부 고를 수 없는 미래면 오른쪽 화살표를 막는다
  const nextStart =
    view === 'day'
      ? cursor.add(1, 'month').startOf('month')
      : view === 'month'
        ? cursor.add(1, 'year').startOf('year')
        : dayjs(`${yearPageStart + YEARS_PER_PAGE}-01-01`);
  const canGoNext = !nextStart.isAfter(max);

  const zoomOut = () => {
    if (view === 'day') setView('month');
    else if (view === 'month') setView('year');
  };

  return (
    <View className="flex-1 justify-end">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="달력 닫기"
        onPress={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <View
        className="gap-4 rounded-t-3xl px-5 pt-5 bg-background"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        {/* 제목: 누르면 일 → 월 → 연으로 넓게 본다 */}
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${title}, 눌러서 더 넓게 보기`}
            disabled={view === 'year'}
            onPress={zoomOut}
            hitSlop={8}
            className="flex-row items-center gap-1"
          >
            <Text weight="700" size={18}>
              {title}
            </Text>
            {view !== 'year' ? (
              <Icon
                as={ChevronDown}
                size={18}
                className="text-muted-foreground"
              />
            ) : null}
          </Pressable>
          <View className="flex-row">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="이전"
              hitSlop={6}
              onPress={() => move(-1)}
              className="h-10 w-10 items-center justify-center"
            >
              <Icon as={ChevronLeft} size={22} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="다음"
              hitSlop={6}
              disabled={!canGoNext}
              onPress={() => move(1)}
              className="h-10 w-10 items-center justify-center"
            >
              <Icon
                as={ChevronRight}
                size={22}
                className={canGoNext ? 'text-foreground' : 'text-muted'}
              />
            </Pressable>
          </View>
        </View>

        {view === 'day' ? (
          <DayGrid
            month={cursor}
            selected={selected}
            max={max}
            onSelect={(d) => onSelect(d.format(DATE_FORMAT))}
          />
        ) : view === 'month' ? (
          <CellGrid
            columns={3}
            cells={Array.from({ length: 12 }, (_, m) => {
              const month = cursor.month(m).startOf('month');
              return {
                key: String(m),
                label: `${m + 1}월`,
                selected: month.isSame(selected, 'month'),
                disabled: month.isAfter(max),
                onPress: () => {
                  setCursor(month);
                  setView('day');
                },
              };
            })}
          />
        ) : (
          <CellGrid
            columns={3}
            cells={Array.from({ length: YEARS_PER_PAGE }, (_, i) => {
              const year = yearPageStart + i;
              return {
                key: String(year),
                label: `${year}`,
                selected: year === selected.year(),
                disabled: year > max.year(),
                onPress: () => {
                  // 미래 달로 넘어가지 않게, 고른 해가 올해면 이번 달을 넘지 않는다
                  const next = cursor.year(year);
                  setCursor(next.isAfter(max) ? max.startOf('month') : next);
                  setView('month');
                },
              };
            })}
          />
        )}

        <Button
          label="오늘로"
          variant="outline"
          size="md"
          // 오늘이 고를 수 있는 마지막 날보다 뒤면 마지막 날로
          onPress={() =>
            onSelect(
              dayjs().isAfter(max)
                ? max.format(DATE_FORMAT)
                : dayjs().format(DATE_FORMAT)
            )
          }
        />
      </View>
    </View>
  );
}

type DayGridProps = {
  month: Dayjs;
  selected: Dayjs;
  max: Dayjs;
  onSelect: (day: Dayjs) => void;
};

/** 한 달 달력 (일요일 시작, 6줄 고정이라 달마다 높이가 안 바뀐다) */
function DayGrid({ month, selected, max, onSelect }: DayGridProps) {
  const first = month.startOf('month');
  const start = first.subtract(first.day(), 'day');
  const days = Array.from({ length: 42 }, (_, i) => start.add(i, 'day'));
  const today = dayjs();

  return (
    <View className="gap-1">
      <View className="flex-row">
        {WEEKDAYS.map((w, i) => (
          <Text
            key={w}
            size={12}
            className={cn(
              'flex-1 text-center text-muted-foreground',
              i === 0 && 'text-destructive'
            )}
          >
            {w}
          </Text>
        ))}
      </View>
      {Array.from({ length: 6 }, (_, row) => (
        <View key={row} className="flex-row">
          {days.slice(row * 7, row * 7 + 7).map((d) => {
            const inMonth = d.month() === month.month();
            const disabled = d.isAfter(max);
            const isSelected = d.isSame(selected, 'day');
            const isToday = d.isSame(today, 'day');
            return (
              <Pressable
                key={d.format(DATE_FORMAT)}
                accessibilityRole="button"
                accessibilityLabel={d.format('YYYY년 M월 D일')}
                accessibilityState={{ selected: isSelected, disabled }}
                disabled={disabled}
                onPress={() => onSelect(d)}
                className="h-11 flex-1 items-center justify-center"
              >
                <View
                  className={cn(
                    'h-10 w-10 items-center justify-center rounded-full',
                    isSelected && 'bg-primary',
                    !isSelected && isToday && 'border border-primary'
                  )}
                >
                  <Text
                    size={15}
                    weight={isSelected ? '700' : '400'}
                    className={cn(
                      isSelected
                        ? 'text-primary-foreground'
                        : disabled || !inMonth
                          ? 'text-muted'
                          : 'text-foreground'
                    )}
                  >
                    {d.date()}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

type Cell = {
  key: string;
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
};

/** 월·연도 고르기용 격자 */
function CellGrid({ cells, columns }: { cells: Cell[]; columns: number }) {
  const rows = Array.from(
    { length: Math.ceil(cells.length / columns) },
    (_, r) => cells.slice(r * columns, r * columns + columns)
  );
  return (
    <View className="gap-2">
      {rows.map((row, r) => (
        <View key={r} className="flex-row gap-2">
          {row.map((c) => (
            <Pressable
              key={c.key}
              accessibilityRole="button"
              accessibilityState={{
                selected: c.selected,
                disabled: c.disabled,
              }}
              disabled={c.disabled}
              onPress={c.onPress}
              className={cn(
                'h-14 flex-1 items-center justify-center rounded-xl',
                c.selected ? 'bg-primary' : 'bg-accent'
              )}
            >
              <Text
                size={15}
                weight={c.selected ? '700' : '500'}
                className={cn(
                  c.selected
                    ? 'text-primary-foreground'
                    : c.disabled
                      ? 'text-muted'
                      : 'text-foreground'
                )}
              >
                {c.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}
