import dayjs from 'dayjs';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useTogether } from '@/hooks/useTogether';
import { Icon, Text } from '@/components/atoms';
import type { BucketItem } from '@/lib/bucket/types';
import { DATE_FORMAT, todayKey } from '@/lib/date';
import { cn } from '@/lib/utils';
import { usePrimaryColor } from '@/store/useSettingsStore';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
/** 연도 화면에 한 번에 보여줄 개수 (3열 × 4줄) */
const YEARS_PER_PAGE = 12;

type Zoom = 'day' | 'month' | 'year';

type DoneCalendarProps = {
  /** 보여줄 기록들 (종류·필터가 적용된 목록) */
  items: BucketItem[];
  /** 고른 날의 기록 한 칸 그리기 (여러 개 고르기 연결은 화면이 한다) */
  renderItem: (item: BucketItem) => ReactNode;
};

/**
 * 달력 보기: 기록이 있는 날에 표시를 하고, 날짜를 누르면 그날 기록을 아래에 모아 보여준다.
 * 처음엔 가장 최근 기록이 있는 달·날짜에서 시작한다.
 */
export function DoneCalendar({ items, renderItem }: DoneCalendarProps) {
  const together = useTogether();
  const doneVerb = together ? '함께했어요' : '기록했어요';
  // 날짜별 기록
  const byDate = useMemo(() => {
    const map = new Map<string, BucketItem[]>();
    for (const it of items) {
      const key = it.done!.date;
      map.set(key, [...(map.get(key) ?? []), it]);
    }
    return map;
  }, [items]);

  const latest = items.reduce<string | null>(
    (max, it) => (!max || it.done!.date > max ? it.done!.date : max),
    null
  );
  const [month, setMonth] = useState(() =>
    dayjs(latest ?? todayKey()).startOf('month')
  );
  const [selected, setSelected] = useState<string>(latest ?? todayKey());
  /** 머리글을 누를 때마다 일 → 월 → 연으로 넓혀 본다 */
  const [zoom, setZoom] = useState<Zoom>('day');

  const today = todayKey();
  const tint = `${usePrimaryColor()}40`;
  const first = month.startOf('month');
  // 앞쪽 빈칸(일요일 시작) + 그 달 날짜들, 7칸씩 줄로
  const cells: (string | null)[] = [
    ...Array.from({ length: first.day() }, () => null),
    ...Array.from({ length: month.daysInMonth() }, (_, i) =>
      first.add(i, 'day').format(DATE_FORMAT)
    ),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) =>
    cells.slice(w * 7, w * 7 + 7)
  );

  const monthCount = [...byDate.keys()].filter((d) =>
    d.startsWith(month.format('YYYY-MM'))
  ).length;
  const dayItems = byDate.get(selected) ?? [];

  /** 'YYYY-MM' 또는 'YYYY'로 시작하는 기록한 날 수 */
  const daysWith = (prefix: string) =>
    [...byDate.keys()].filter((d) => d.startsWith(prefix)).length;
  // 연도 화면은 12년씩 (지금 연도가 들어 있는 묶음)
  const yearStart = month.year() - (month.year() % YEARS_PER_PAGE);

  const header =
    zoom === 'day'
      ? {
          title: month.format('YYYY년 M월'),
          sub: monthCount > 0 ? `${monthCount}일 ${doneVerb}` : '기록이 없어요',
          prev: () => setMonth((m) => m.subtract(1, 'month')),
          next: () => setMonth((m) => m.add(1, 'month')),
          unit: '달',
        }
      : zoom === 'month'
        ? {
            title: `${month.year()}년`,
            sub: `${daysWith(String(month.year()))}일 ${doneVerb}`,
            prev: () => setMonth((m) => m.subtract(1, 'year')),
            next: () => setMonth((m) => m.add(1, 'year')),
            unit: '해',
          }
        : {
            title: `${yearStart} – ${yearStart + YEARS_PER_PAGE - 1}`,
            sub: '연도를 골라요',
            prev: () => setMonth((m) => m.subtract(YEARS_PER_PAGE, 'year')),
            next: () => setMonth((m) => m.add(YEARS_PER_PAGE, 'year')),
            unit: '묶음',
          };

  return (
    <View className="gap-4">
      <View className="gap-3 rounded-3xl border p-4 border-border">
        {/* 옮기기 + 머리글 (누르면 한 단계 넓게) */}
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`이전 ${header.unit}`}
            hitSlop={8}
            onPress={header.prev}
            className="h-9 w-9 items-center justify-center"
          >
            <Icon as={ChevronLeft} size={20} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="더 넓게 보기"
            disabled={zoom === 'year'}
            onPress={() => setZoom(zoom === 'day' ? 'month' : 'year')}
            className="items-center active:opacity-60"
          >
            <View className="flex-row items-center gap-1">
              <Text weight="700" size={16}>
                {header.title}
              </Text>
              {zoom !== 'year' ? (
                <Icon
                  as={ChevronDown}
                  size={16}
                  className="text-muted-foreground"
                />
              ) : null}
            </View>
            <Text size={11} className="text-muted-foreground">
              {header.sub}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`다음 ${header.unit}`}
            hitSlop={8}
            onPress={header.next}
            className="h-9 w-9 items-center justify-center"
          >
            <Icon as={ChevronRight} size={20} />
          </Pressable>
        </View>

        {zoom === 'month' ? (
          <ZoomGrid
            cells={Array.from({ length: 12 }, (_, i) => {
              const m = month.month(i);
              return {
                key: m.format('YYYY-MM'),
                label: `${i + 1}월`,
                count: daysWith(m.format('YYYY-MM')),
                current: i === month.month(),
              };
            })}
            onPick={(key) => {
              setMonth(dayjs(`${key}-01`));
              setZoom('day');
            }}
          />
        ) : zoom === 'year' ? (
          <ZoomGrid
            cells={Array.from({ length: YEARS_PER_PAGE }, (_, i) => {
              const y = yearStart + i;
              return {
                key: String(y),
                label: `${y}`,
                count: daysWith(String(y)),
                current: y === month.year(),
              };
            })}
            onPick={(key) => {
              setMonth((m) => m.year(Number(key)));
              setZoom('month');
            }}
          />
        ) : (
          <>
            {/* 요일 */}
            <View className="flex-row">
              {WEEKDAYS.map((w, i) => (
                <Text
                  key={w}
                  size={11}
                  weight="600"
                  className={cn(
                    'flex-1 text-center',
                    i === 0 ? 'text-destructive' : 'text-muted-foreground'
                  )}
                >
                  {w}
                </Text>
              ))}
            </View>

            {/* 날짜 */}
            <View className="gap-1">
              {weeks.map((week, w) => (
                <View key={w} className="flex-row">
                  {week.map((date, i) => {
                    if (!date) return <View key={`e${i}`} className="flex-1" />;
                    const count = byDate.get(date)?.length ?? 0;
                    const isSelected = date === selected;
                    return (
                      <Pressable
                        key={date}
                        accessibilityRole="button"
                        accessibilityLabel={`${dayjs(date).format('M월 D일')}${count ? `, 기록 ${count}개` : ''}`}
                        accessibilityState={{ selected: isSelected }}
                        onPress={() => setSelected(date)}
                        className="flex-1 items-center py-0.5"
                      >
                        <View
                          className={cn(
                            'h-10 w-10 items-center justify-center rounded-full',
                            isSelected && 'bg-primary'
                          )}
                          // 기록 있는 날: 테마색을 연하게 (bg-primary/15는 색 변수와 함께 안 먹는다)
                          style={
                            !isSelected && count > 0
                              ? { backgroundColor: tint }
                              : undefined
                          }
                        >
                          <Text
                            size={14}
                            weight={count > 0 || date === today ? '700' : '400'}
                            className={cn(
                              isSelected
                                ? 'text-primary-foreground'
                                : count > 0
                                  ? 'text-primary'
                                  : 'text-foreground',
                              date === today && !isSelected && 'underline'
                            )}
                          >
                            {dayjs(date).date()}
                          </Text>
                        </View>
                        {/* 기록 수만큼 점 (최대 3개) */}
                        <View className="mt-0.5 h-1.5 flex-row gap-0.5">
                          {Array.from(
                            { length: Math.min(count, 3) },
                            (_, k) => (
                              <View
                                key={k}
                                className="h-1 w-1 rounded-full bg-primary"
                              />
                            )
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </>
        )}
      </View>

      {/* 고른 날의 기록 */}
      <View className="gap-2">
        <Text weight="700" size={15}>
          {dayjs(selected).format('M월 D일 (dd)')}
          <Text size={13} className="text-muted-foreground">
            {dayItems.length > 0 ? ` · ${dayItems.length}개` : ''}
          </Text>
        </Text>
        {dayItems.length > 0 ? (
          dayItems.map((it) => <View key={it.id}>{renderItem(it)}</View>)
        ) : (
          <Text variant="muted" size={13} className="py-4 text-center">
            이날은 기록이 없어요
          </Text>
        )}
      </View>
    </View>
  );
}

/** 월·연 고르기 칸 (3열). 기록한 날이 있으면 테마색으로 칠하고 날 수를 적는다 */
function ZoomGrid({
  cells,
  onPick,
}: {
  cells: { key: string; label: string; count: number; current: boolean }[];
  onPick: (key: string) => void;
}) {
  const tint = `${usePrimaryColor()}40`;
  const rows = Array.from({ length: Math.ceil(cells.length / 3) }, (_, r) =>
    cells.slice(r * 3, r * 3 + 3)
  );
  return (
    <View className="gap-2">
      {rows.map((row, r) => (
        <View key={r} className="flex-row gap-2">
          {row.map((cell) => (
            <Pressable
              key={cell.key}
              accessibilityRole="button"
              accessibilityState={{ selected: cell.current }}
              onPress={() => onPick(cell.key)}
              className={cn(
                'h-16 flex-1 items-center justify-center gap-0.5 rounded-2xl active:opacity-70',
                cell.current ? 'bg-primary' : cell.count > 0 ? '' : 'bg-accent'
              )}
              style={
                !cell.current && cell.count > 0
                  ? { backgroundColor: tint }
                  : undefined
              }
            >
              <Text
                weight="700"
                size={15}
                className={cn(
                  cell.current
                    ? 'text-primary-foreground'
                    : cell.count > 0
                      ? 'text-primary'
                      : 'text-foreground'
                )}
              >
                {cell.label}
              </Text>
              <Text
                size={11}
                className={
                  cell.current
                    ? 'text-primary-foreground'
                    : 'text-muted-foreground'
                }
              >
                {cell.count > 0 ? `${cell.count}일` : ' '}
              </Text>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}
