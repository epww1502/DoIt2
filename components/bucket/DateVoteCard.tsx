import dayjs from 'dayjs';
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';

import { Icon, Text } from '@/components/atoms';
import { PersonAvatar } from '@/components/space/PersonAvatar';
import { useDateVotes } from '@/hooks/useDateVotes';
import {
  bestRuns,
  daysBetween,
  rangeLabels,
  runAround,
  runLabel,
  tallyDays,
  voteDayLabel,
  voterCount,
} from '@/lib/bucket/dateVotes';
import type { BucketItem, GoalRemind } from '@/lib/bucket/types';
import { DATE_FORMAT, todayKey } from '@/lib/date';
import { showAlert } from '@/lib/dialog';
import { hapticSelect, hapticSuccess } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useBucketStore } from '@/store/useBucketStore';
import type { MemberInfo } from '@/store/useMembersStore';
import { usePrimaryColor } from '@/store/useSettingsStore';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
/** 날짜 동그라미(h-9 = 36)의 반지름. 이어진 날은 이 높이의 띠로 묶는다 */
const BAND_HALF = 18;
/** 몇 달 뒤까지 고를 수 있는지 */
const MAX_MONTHS_AHEAD = 6;
/** 날을 정할 때 따로 정한 알림이 없으면 */
const DEFAULT_REMIND: GoalRemind[] = ['week', 'day'];
/** 달력 한 주 줄 높이(h-12 = 48) + 줄 사이 간격(gap-1 = 4) */
const ROW_PITCH = 52;
const NO_STYLE = {};
/** 꾹 누르고 있어야 끌어서 고르기가 시작된다 (그냥 끌면 화면 스크롤) */
const DRAG_HOLD_MS = 250;

type Props = {
  item: BucketItem;
  spaceId: string;
  /** 지금 공간 인원 */
  memberCount: number;
  /** '하고 싶어요' 누른 사람 수 (2명 이상이면 날짜 정해 보자고 권한다) */
  wantCount: number;
  member: (userId: string) => MemberInfo;
  /** 끌어서 고르는 동안 true (바깥 화면 스크롤을 멈추려고) */
  onDraggingChange?: (dragging: boolean) => void;
};

/**
 * 같이 갈 날 맞추기 (함께 쓰는 공간, 아직 안 한 항목).
 * 각자 되는 날을 누르면 날마다 몇 명 되는지 보이고, 많이 되는 날을 목표 날짜로 정한다.
 */
export function DateVoteCard({
  item,
  spaceId,
  memberCount,
  wantCount,
  member,
  onDraggingChange,
}: Props) {
  const votes = useDateVotes(spaceId);
  const updateItem = useBucketStore((s) => s.updateItem);
  const tint = `${usePrimaryColor()}33`;
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => dayjs().startOf('month'));

  const today = todayKey();
  const rows = votes.votesOf(item.id);
  const tally = tallyDays(rows, today);
  const byDay = new Map(tally.map((t) => [t.day, t.users]));
  // 연속되고 되는 사람이 같은 날은 기간으로 묶어서
  const best = bestRuns(tally);
  const voters = voterCount(rows, today);
  const meId = rows.find((r) => member(r.user_id).isMe)?.user_id;
  /** 내가 고른 날 (오늘부터) */
  const myDays = tally
    .filter((t) => t.users.some((u) => member(u).isMe))
    .map((t) => t.day);
  const isAll = (n: number) => memberCount >= 2 && n >= memberCount;

  const subtitle = (() => {
    if (voters > 0) {
      const top = best[0];
      const allDays = tally.filter((t) => isAll(t.users.length)).length;
      if (allDays > 0)
        return `다 되는 날이 ${allDays}일 있어요 · ${voters}명이 골랐어요`;
      return `${voters}명이 골랐어요 · 가장 많이 되는 날 ${runLabel(top.from, top.to)}`;
    }
    if (item.goal)
      return `정한 날 ${voteDayLabel(item.goal.date)} · 다시 맞춰 볼 수 있어요`;
    if (wantCount >= 2)
      return `하고 싶은 사람이 ${wantCount}명이에요. 날짜 정해 볼까요?`;
    return '되는 날을 고르면 다 같이 되는 날을 찾아 줘요';
  })();
  const nudge = voters === 0 && !item.goal && wantCount >= 2;

  /** 그 기간으로 정한다. 목표 날짜는 하루만 둘 수 있어서 기간이면 시작하는 날로 */
  const decide = (from: string, to: string) => {
    const day = from;
    showAlert(
      `${runLabel(from, to)}로 정할까요?`,
      from === to
        ? '목표 날짜로 정하고, 그 전에 알려 드려요. 고른 날짜 표는 비워져요.'
        : `시작하는 날(${voteDayLabel(from)})을 목표 날짜로 정하고, 그 전에 알려 드려요. 고른 날짜 표는 비워져요.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '이 날로 정하기',
          onPress: () => {
            updateItem(item.id, {
              goal: {
                date: day,
                remind: item.goal?.remind.length
                  ? item.goal.remind
                  : DEFAULT_REMIND,
              },
            });
            void votes.clear(item.id);
            hapticSuccess();
            setOpen(false);
          },
        },
      ]
    );
  };

  // 달력: 이 달 1일이 있는 주부터 말일이 있는 주까지
  const first = month.startOf('month');
  const lead = first.day();
  const weeks = Math.ceil((lead + first.daysInMonth()) / 7);
  const thisMonth = dayjs().startOf('month');
  // 꾹 누른 채 끌어서 기간 고르기: 처음 누른 날이 안 고른 날이면 넣고, 고른 날이면 뺀다
  const [gridWidth, setGridWidth] = useState(0);
  const [drag, setDrag] = useState<{
    from: string;
    to: string;
    on: boolean;
  } | null>(null);
  // 제스처 콜백(나중에 불림)에서 지금 끄는 기간을 읽으려고 따로 들고 있는 값
  const dragNow = useSharedValue<typeof drag>(null);
  const isMineOn = (day: string) =>
    (byDay.get(day) ?? []).some((u) => member(u).isMe);
  /** 달력 안 손가락 위치의 날 (빈칸·지난 날이면 null) */
  const dayAt = (x: number, y: number) => {
    if (gridWidth <= 0) return null;
    const col = Math.floor(x / (gridWidth / 7));
    const row = Math.floor(y / ROW_PITCH);
    if (col < 0 || col > 6 || row < 0 || row >= weeks) return null;
    const n = row * 7 + col - lead + 1;
    if (n < 1 || n > first.daysInMonth()) return null;
    const day = first.date(n).format(DATE_FORMAT);
    return day < today ? null : day;
  };
  const setDragBoth = (next: typeof drag) => {
    dragNow.set(next);
    setDrag(next);
  };
  const pan = Gesture.Pan()
    .runOnJS(true)
    .activateAfterLongPress(DRAG_HOLD_MS)
    .onStart((e) => {
      const day = dayAt(e.x, e.y);
      if (!day) return;
      hapticSelect();
      onDraggingChange?.(true);
      setDragBoth({ from: day, to: day, on: !isMineOn(day) });
    })
    .onUpdate((e) => {
      const current = dragNow.get();
      const day = dayAt(e.x, e.y);
      if (!current || !day || day === current.to) return;
      hapticSelect();
      setDragBoth({ ...current, to: day });
    })
    .onFinalize(() => {
      const current = dragNow.get();
      if (!current) return;
      setDragBoth(null);
      onDraggingChange?.(false);
      void votes.setDays(
        item.id,
        daysBetween(current.from, current.to, today),
        current.on,
        memberCount
      );
    });
  const inDrag = (day: string) => {
    if (!drag || day < today) return false;
    const [a, b] =
      drag.from <= drag.to ? [drag.from, drag.to] : [drag.to, drag.from];
    return day >= a && day <= b;
  };
  /** 그 날 칸을 어떻게 칠하는지: 내가 되는 날(진하게), 다른 사람만 되는 날(연하게) */
  const fillOf = (n: number): 'mine' | 'others' | null => {
    if (n < 1 || n > first.daysInMonth()) return null;
    const day = first.date(n).format(DATE_FORMAT);
    if (day < today) return null;
    const users = byDay.get(day) ?? [];
    // 끄는 중이면 그 기간은 넣을지/뺄지 미리 보여준다
    const mine = inDrag(day) ? drag!.on : users.some((u) => member(u).isMe);
    if (mine) return 'mine';
    return users.length > 0 ? 'others' : null;
  };

  /**
   * 날 누르기: 안 고른 날이면 그 날을 넣고, 고른 날이면 이어서 고른 기간을 통째로 뺀다
   * (하루만 빼려면 꾹 누른 채 그 날만 끌면 된다)
   */
  const pressDay = (day: string) => {
    hapticSelect();
    if (!isMineOn(day)) {
      void votes.toggle(item.id, day, memberCount);
      return;
    }
    const mineDays = [...byDay.keys()].filter(isMineOn);
    void votes.setDays(item.id, runAround(mineDays, day), false, memberCount);
  };

  const canPrev = month.isAfter(thisMonth, 'month');
  const canNext = month.isBefore(
    thisMonth.add(MAX_MONTHS_AHEAD, 'month'),
    'month'
  );

  return (
    <View className="gap-3 rounded-2xl p-4 bg-accent">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`같이 갈 날, ${subtitle}`}
        onPress={() => setOpen((v) => !v)}
        className="flex-row items-center gap-3 active:opacity-70"
      >
        <Icon as={CalendarDays} size={18} className="text-primary" />
        <View className="flex-1 gap-0.5">
          <Text weight="600" size={15}>
            {item.goal && voters === 0 ? '다시 맞춰 보기' : '같이 갈 날 정하기'}
          </Text>
          <Text
            size={12}
            weight={nudge ? '600' : '400'}
            className={nudge ? 'text-primary' : 'text-muted-foreground'}
          >
            {subtitle}
          </Text>
        </View>
        <Icon
          as={open ? ChevronUp : ChevronDown}
          size={18}
          className="text-muted-foreground"
        />
      </Pressable>

      {open ? (
        <View className="gap-3">
          <Text variant="muted" size={12}>
            {
              '내가 되는 날을 눌러요. 꾹 누른 채 끌면 기간을 한 번에 골라요. 고른 날을 다시 누르면 이어진 기간이 통째로 빠져요. 숫자는 되는 사람 수예요'
            }
          </Text>

          <View className="flex-row items-center justify-between">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="이전 달"
              disabled={!canPrev}
              hitSlop={8}
              onPress={() => setMonth((m) => m.subtract(1, 'month'))}
              className={cn('p-1 active:opacity-60', !canPrev && 'opacity-30')}
            >
              <Icon as={ChevronLeft} size={20} className="text-foreground" />
            </Pressable>
            <Text weight="700" size={15}>
              {month.format('YYYY년 M월')}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="다음 달"
              disabled={!canNext}
              hitSlop={8}
              onPress={() => setMonth((m) => m.add(1, 'month'))}
              className={cn('p-1 active:opacity-60', !canNext && 'opacity-30')}
            >
              <Icon as={ChevronRight} size={20} className="text-foreground" />
            </Pressable>
          </View>

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
            <GestureHandlerRootView style={NO_STYLE}>
              <GestureDetector gesture={pan}>
                <View
                  className="gap-1"
                  onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}
                >
                  {Array.from({ length: weeks }, (_, row) => (
                    <View key={row} className="flex-row">
                      {Array.from({ length: 7 }, (_, col) => {
                        const n = row * 7 + col - lead + 1;
                        if (n < 1 || n > first.daysInMonth()) {
                          return <View key={col} className="h-12 flex-1" />;
                        }
                        const day = first.date(n).format(DATE_FORMAT);
                        const users = byDay.get(day) ?? [];
                        const past = day < today;
                        const fill = fillOf(n);
                        const mine = fill === 'mine';
                        const all = isAll(users.length);
                        // 같은 주에서 옆날도 같은 색이면 띠로 이어서 하나처럼 보이게
                        const joinLeft =
                          fill !== null && col > 0 && fillOf(n - 1) === fill;
                        const joinRight =
                          fill !== null && col < 6 && fillOf(n + 1) === fill;
                        return (
                          <Pressable
                            key={col}
                            accessibilityRole="button"
                            accessibilityLabel={`${voteDayLabel(day)}${users.length ? `, ${users.length}명 돼요` : ''}`}
                            accessibilityState={{
                              selected: mine,
                              disabled: past,
                            }}
                            disabled={past}
                            onPress={() => pressDay(day)}
                            className="h-12 flex-1 items-center"
                          >
                            {fill ? (
                              <View
                                pointerEvents="none"
                                className={cn(
                                  'absolute top-0 h-9',
                                  mine && 'bg-primary'
                                )}
                                style={{
                                  left: joinLeft ? 0 : '50%',
                                  right: joinRight ? 0 : '50%',
                                  marginLeft: joinLeft ? 0 : -BAND_HALF,
                                  marginRight: joinRight ? 0 : -BAND_HALF,
                                  borderTopLeftRadius: joinLeft ? 0 : BAND_HALF,
                                  borderBottomLeftRadius: joinLeft
                                    ? 0
                                    : BAND_HALF,
                                  borderTopRightRadius: joinRight
                                    ? 0
                                    : BAND_HALF,
                                  borderBottomRightRadius: joinRight
                                    ? 0
                                    : BAND_HALF,
                                  backgroundColor: mine ? undefined : tint,
                                }}
                              />
                            ) : null}
                            <View
                              className={cn(
                                'h-9 w-9 items-center justify-center rounded-full',
                                day === today &&
                                  !fill &&
                                  'border border-primary'
                              )}
                            >
                              <Text
                                size={14}
                                weight={users.length > 0 ? '700' : '400'}
                                className={cn(
                                  mine
                                    ? 'text-primary-foreground'
                                    : past
                                      ? 'text-muted'
                                      : users.length > 0
                                        ? 'text-primary'
                                        : 'text-foreground'
                                )}
                              >
                                {n}
                              </Text>
                            </View>
                            {users.length > 0 ? (
                              <Text
                                size={10}
                                weight="700"
                                className={
                                  all ? 'text-primary' : 'text-muted-foreground'
                                }
                              >
                                {all ? '모두' : `${users.length}명`}
                              </Text>
                            ) : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </GestureDetector>
            </GestureHandlerRootView>
          </View>

          {myDays.length > 0 ? (
            <Text size={12} className="text-muted-foreground">
              내가 되는 날 · {rangeLabels(myDays).join(', ')}
            </Text>
          ) : null}

          {best.length > 0 ? (
            <View className="gap-2">
              <Text weight="600" size={13} className="text-muted-foreground">
                많이 되는 날
              </Text>
              {best.map((t) => {
                const people = t.users.map(member);
                const all = isAll(t.users.length);
                return (
                  <View
                    key={t.from}
                    className="flex-row items-center gap-2 rounded-xl bg-background px-3 py-2"
                  >
                    <View className="flex-1 gap-1">
                      <Text weight="600" size={14}>
                        {runLabel(t.from, t.to)}
                        {t.length > 1 ? (
                          <Text size={12} className="text-muted-foreground">
                            {` · ${t.length}일`}
                          </Text>
                        ) : null}
                      </Text>
                      <View className="flex-row items-center gap-1.5">
                        <View className="flex-row">
                          {people.slice(0, 4).map((p, i) => (
                            <View
                              key={i}
                              style={{ marginLeft: i === 0 ? 0 : -6 }}
                            >
                              <PersonAvatar
                                imagePath={p.avatarPath}
                                size={18}
                              />
                            </View>
                          ))}
                        </View>
                        <Text
                          size={12}
                          weight={all ? '700' : '400'}
                          className={
                            all ? 'text-primary' : 'text-muted-foreground'
                          }
                          numberOfLines={1}
                        >
                          {all
                            ? '다 돼요 🎉'
                            : `${people.map((p) => p.name).join(', ')} 돼요`}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${runLabel(t.from, t.to)}로 정하기`}
                      onPress={() => decide(t.from, t.to)}
                      className="h-9 items-center justify-center rounded-full bg-primary px-3 active:opacity-70"
                    >
                      <Text
                        weight="600"
                        size={13}
                        className="text-primary-foreground"
                      >
                        {t.length > 1 ? '이 기간으로' : '이 날로 정하기'}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : null}
          {meId === undefined && voters > 0 ? (
            <Text size={12} className="text-primary">
              나도 되는 날을 골라 주세요
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
