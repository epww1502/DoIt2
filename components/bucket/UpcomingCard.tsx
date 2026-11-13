import { router } from 'expo-router';
import { CalendarDays, ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon, Text } from '@/components/atoms';
import type { Upcoming } from '@/lib/bucket/upcoming';

import { goalDday } from './goalDday';

/** 버킷리스트 맨 위: 다가오는 일정 한 줄 (누르면 날짜순 모아보기로) */
export function UpcomingCard({ upcoming }: { upcoming: Upcoming }) {
  if (upcoming.total === 0) return null;
  const { next, overdue } = upcoming;
  const detail = next
    ? `${next.title} · ${goalDday(next.goal!.date)}`
    : `날짜가 지난 것 ${overdue.length}개`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="다가오는 일정 보기"
      onPress={() => router.push('/upcoming')}
      className="flex-row items-center gap-3 rounded-2xl p-4 bg-accent active:opacity-80"
    >
      <Icon as={CalendarDays} size={18} className="text-primary" />
      <View className="flex-1 gap-0.5">
        <Text weight="700" size={15}>
          다가오는 일정 · {upcoming.total}
        </Text>
        <Text variant="muted" size={12} numberOfLines={1}>
          {detail}
          {next && overdue.length > 0 ? ` · 지난 것 ${overdue.length}개` : ''}
        </Text>
      </View>
      <Icon as={ChevronRight} size={16} className="text-muted-foreground" />
    </Pressable>
  );
}
