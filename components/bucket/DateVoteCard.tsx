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

import { Icon, Text } from '@/components/atoms';
import { PersonAvatar } from '@/components/space/PersonAvatar';
import { useDateVotes } from '@/hooks/useDateVotes';
import {
  bestDays,
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
/** 몇 달 뒤까지 고를 수 있는지 */
const MAX_MONTHS_AHEAD = 6;
/** 날을 정할 때 따로 정한 알림이 없으면 */
const DEFAULT_REMIND: GoalRemind[] = ['week', 'day'];

type Props = {
  item: BucketItem;
  spaceId: string;
  /** 지금 공간 인원 */
  memberCount: number;
  /** '하고 싶어요' 누른 사람 수 (2명 이상이면 날짜 정해 보자고 권한다) */
  wantCount: number;
  member: (userId: string) => MemberInfo;
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
  const best = bestDays(tally);
  const voters = voterCount(rows, today);
  const meId = rows.find((r) => member(r.user_id).isMe)?.user_id;
  const isAll = (n: number) => memberCount >= 2 && n >= memberCount;

  const subtitle = (() => {
    if (voters > 0) {
      const top = best[0];
      const allDays = tally.filter((t) => isAll(t.users.length)).length;
      if (allDays > 0)
        return `다 되는 날이 ${allDays}일 있어요 · ${voters}명이 골랐어요`;
      return `${voters}명이 골랐어요 · 가장 많이 되는 날 ${voteDayLabel(top.day)}`;
    }
    if (item.goal)
      return `정한 날 ${voteDayLabel(item.goal.date)} · 다시 맞춰 볼 수 있어요`;
    if (wantCount >= 2)
      return `하고 싶은 사람이 ${wantCount}명이에요. 날짜 정해 볼까요?`;
    return '되는 날을 고르면 다 같이 되는 날을 찾아 줘요';
  })();
  const nudge = voters === 0 && !item.goal && wantCount >= 2;

  const decide = (day: string) =>
    showAlert(
      `${voteDayLabel(day)}로 정할까요?`,
      '목표 날짜로 정하고, 그 전에 알려 드려요. 고른 날짜 표는 비워져요.',
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

  // 달력: 이 달 1일이 있는 주부터 말일이 있는 주까지
  const first = month.startOf('month');
  const lead = first.day();
  const weeks = Math.ceil((lead + first.daysInMonth()) / 7);
  const thisMonth = dayjs().startOf('month');
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
            내가 되는 날을 눌러요. 다시 누르면 빠져요. 숫자는 되는 사람 수예요
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
                  const mine = users.some((u) => member(u).isMe);
                  const all = isAll(users.length);
                  return (
                    <Pressable
                      key={col}
                      accessibilityRole="button"
                      accessibilityLabel={`${voteDayLabel(day)}${users.length ? `, ${users.length}명 돼요` : ''}`}
                      accessibilityState={{ selected: mine, disabled: past }}
                      disabled={past}
                      onPress={() => {
                        hapticSelect();
                        void votes.toggle(item.id, day, memberCount);
                      }}
                      className="h-12 flex-1 items-center"
                    >
                      <View
                        className={cn(
                          'h-9 w-9 items-center justify-center rounded-full',
                          mine && 'bg-primary',
                          day === today && !mine && 'border border-primary'
                        )}
                        style={
                          !mine && users.length > 0
                            ? { backgroundColor: tint }
                            : undefined
                        }
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
                    key={t.day}
                    className="flex-row items-center gap-2 rounded-xl bg-background px-3 py-2"
                  >
                    <View className="flex-1 gap-1">
                      <Text weight="600" size={14}>
                        {voteDayLabel(t.day)}
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
                      accessibilityLabel={`${voteDayLabel(t.day)}로 정하기`}
                      onPress={() => decide(t.day)}
                      className="h-9 items-center justify-center rounded-full bg-primary px-3 active:opacity-70"
                    >
                      <Text
                        weight="600"
                        size={13}
                        className="text-primary-foreground"
                      >
                        이 날로 정하기
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
