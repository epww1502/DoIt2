import dayjs, { type Dayjs } from 'dayjs';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon, Text } from '@/components/atoms';
import { DATE_FORMAT } from '@/lib/date';
import { cn } from '@/lib/utils';
import { SheetPanel } from '@/components/atoms/SheetPanel';
import { usePrimaryColor } from '@/store/useSettingsStore';

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
  /**
   * 주면 기간도 고를 수 있다: 한 번 누르면 하루, 다른 날을 한 번 더 누르면 그 사이.
   * 확인을 눌러야 반영되고, 하루만 골랐으면 end는 null
   */
  onRangeChange?: (start: string, end: string | null) => void;
  /** 기간으로 정해 둔 마지막 날 (onRangeChange와 함께) */
  rangeEnd?: string | null;
};

/** 아래에서 올라오는 달력. 날짜를 고르면 닫힌다 (기간 고르기는 확인을 눌러야) */
export function DatePickerSheet({
  visible,
  value,
  onChange,
  onClose,
  maxDate,
  onRangeChange,
  rangeEnd,
}: DatePickerSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
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
          rangeEnd={rangeEnd}
          onRangeSelect={
            onRangeChange
              ? (start, end) => {
                  onRangeChange(start, end);
                  onClose();
                }
              : undefined
          }
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
  rangeEnd?: string | null;
  onRangeSelect?: (start: string, end: string | null) => void;
};

/** '11월 17일 (화)' */
const dayLabel = (day: string) => dayjs(day).format('M월 D일 (dd)');

function Calendar({
  value,
  maxDate,
  onSelect,
  onClose,
  rangeEnd,
  onRangeSelect,
}: CalendarProps) {
  const insets = useSafeAreaInsets();
  const ranged = !!onRangeSelect;
  // 기간 고르기: 확인 전까지는 여기에만 (처음엔 정해 둔 날·기간을 보여준다)
  const [draft, setDraft] = useState<{ start: string; end: string | null }>({
    start: value,
    end: rangeEnd && rangeEnd > value ? rangeEnd : null,
  });
  // 열고 나서 처음 누르는 날은 항상 새로 시작 (정해 둔 날에 이어 붙지 않게)
  const [picking, setPicking] = useState(false);
  const pickRangeDay = (day: string) => {
    if (!picking || draft.end || day === draft.start) {
      setDraft({ start: day, end: null });
      setPicking(true);
      return;
    }
    setDraft(
      day < draft.start
        ? { start: day, end: draft.start }
        : { start: draft.start, end: day }
    );
  };
  const selected = dayjs(ranged ? draft.start : value);
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
      <SheetPanel onClose={onClose}>
        <View
          className="shrink gap-4 rounded-t-3xl bg-background px-5 pt-5"
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
              end={ranged && draft.end ? dayjs(draft.end) : null}
              max={max}
              onSelect={(d) =>
                ranged
                  ? pickRangeDay(d.format(DATE_FORMAT))
                  : onSelect(d.format(DATE_FORMAT))
              }
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

          {ranged ? (
            <View className="gap-3">
              <View className="items-center gap-0.5">
                <Text weight="600" size={15}>
                  {draft.end
                    ? `${dayLabel(draft.start)} ~ ${dayLabel(draft.end)} · ${
                        dayjs(draft.end).diff(dayjs(draft.start), 'day') + 1
                      }일`
                    : dayLabel(draft.start)}
                </Text>
                <Text variant="muted" size={12}>
                  {draft.end
                    ? '다른 날을 누르면 다시 골라요'
                    : '며칠 동안이면 마지막 날을 한 번 더 눌러요'}
                </Text>
              </View>
              <Button
                label="확인"
                size="md"
                onPress={() => onRangeSelect?.(draft.start, draft.end)}
              />
            </View>
          ) : (
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
          )}
        </View>
      </SheetPanel>
    </View>
  );
}

type DayGridProps = {
  month: Dayjs;
  selected: Dayjs;
  /** 기간으로 골랐으면 마지막 날 (selected가 첫날) */
  end?: Dayjs | null;
  max: Dayjs;
  onSelect: (day: Dayjs) => void;
};

/** 기간 띠의 반 높이 (날짜 동그라미 반지름) */
const BAND_HALF = 20;

/** 한 달 달력 (일요일 시작, 6줄 고정이라 달마다 높이가 안 바뀐다) */
function DayGrid({ month, selected, end, max, onSelect }: DayGridProps) {
  const first = month.startOf('month');
  const start = first.subtract(first.day(), 'day');
  const days = Array.from({ length: 42 }, (_, i) => start.add(i, 'day'));
  const today = dayjs();
  const primary = usePrimaryColor();
  const startKey = selected.format(DATE_FORMAT);
  const endKey = end ? end.format(DATE_FORMAT) : null;
  /** 이 줄에서 기간에 들어가는 칸 (첫 칸~끝 칸). 없으면 null */
  const bandOfRow = (row: number) => {
    if (!endKey) return null;
    let from = -1;
    let to = -1;
    for (let col = 0; col < 7; col++) {
      const key = days[row * 7 + col].format(DATE_FORMAT);
      if (key >= startKey && key <= endKey) {
        if (from < 0) from = col;
        to = col;
      }
    }
    return from < 0 ? null : { from, to };
  };

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
      {Array.from({ length: 6 }, (_, row) => {
        const band = bandOfRow(row);
        return (
          <View key={row} className="flex-row">
            {/* 기간은 줄마다 연한 띠 한 조각으로 (칸마다 그리면 사이에 실선이 보인다) */}
            {band ? (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 2,
                  height: BAND_HALF * 2,
                  left: `${((band.from + 0.5) / 7) * 100}%`,
                  right: `${((6 - band.to + 0.5) / 7) * 100}%`,
                  marginLeft: -BAND_HALF,
                  marginRight: -BAND_HALF,
                  borderRadius: BAND_HALF,
                  backgroundColor: `${primary}33`,
                }}
              />
            ) : null}
            {days.slice(row * 7, row * 7 + 7).map((d) => {
              const inMonth = d.month() === month.month();
              const disabled = d.isAfter(max);
              const isSelected =
                d.isSame(selected, 'day') || (!!end && d.isSame(end, 'day'));
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
        );
      })}
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
