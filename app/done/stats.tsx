import dayjs from 'dayjs';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTogether } from '@/hooks/useTogether';
import { NavBar, Text } from '@/components/atoms';
import { ItemIcon } from '@/components/bucket/ItemIcon';
import { EmptyState } from '@/components/bucket/EmptyState';
import { useReviewCtx } from '@/hooks/useReviewCtx';
import { itemStatus, viewForMe } from '@/lib/bucket/reviews';
import { SyncEmpty, useListSync } from '@/components/bucket/SyncNotice';
import { StarRating } from '@/components/bucket/StarRating';
import { getCategory, type BucketItem } from '@/lib/bucket/types';
import { cn } from '@/lib/utils';
import { useBucketStore } from '@/store/useBucketStore';

/** 월별 막대에 보여줄 개월 수 */
const MONTHS = 12;
/** 막대 최대 높이(px) */
const BAR_HEIGHT = 96;

type Stats = {
  total: number;
  thisYear: number;
  places: number;
  activities: number;
  averageRating: number;
  firstDate: string;
  months: { key: string; label: string; count: number }[];
  categories: { key: string; label: string; emoji: string; count: number }[];
  best: BucketItem[];
};

function buildStats(done: BucketItem[]): Stats {
  const now = dayjs();
  const months = Array.from({ length: MONTHS }, (_, i) => {
    const m = now.subtract(MONTHS - 1 - i, 'month');
    return { key: m.format('YYYY-MM'), label: `${m.month() + 1}월`, count: 0 };
  });
  const monthIndex = new Map(months.map((m, i) => [m.key, i]));
  const categoryCount = new Map<string, number>();
  let ratingSum = 0;
  let ratedCount = 0;

  for (const it of done) {
    const d = it.done!;
    // 평가를 건너뛴 것(0)은 평균에서 뺀다
    if (d.rating > 0) {
      ratingSum += d.rating;
      ratedCount += 1;
    }
    const i = monthIndex.get(d.date.slice(0, 7));
    if (i !== undefined) months[i].count += 1;
    categoryCount.set(it.category, (categoryCount.get(it.category) ?? 0) + 1);
  }

  const categories = [...categoryCount.entries()]
    .map(([key, count]) => {
      const c = getCategory(key as BucketItem['category']);
      return { key, label: c.label, emoji: c.emoji, count };
    })
    .sort((a, b) => b.count - a.count);

  // 별점 높은 순, 같으면 최근 순
  const best = [...done]
    .sort(
      (a, b) =>
        b.done!.rating - a.done!.rating ||
        (b.done!.date > a.done!.date ? 1 : -1)
    )
    .slice(0, 3);

  const dates = done.map((it) => it.done!.date).sort();
  return {
    total: done.length,
    thisYear: done.filter((it) => dayjs(it.done!.date).year() === now.year())
      .length,
    places: done.filter((it) => it.kind === 'place').length,
    activities: done.filter((it) => it.kind === 'activity').length,
    averageRating: ratedCount > 0 ? ratingSum / ratedCount : 0,
    firstDate: dates[0] ?? '',
    months,
    categories,
    best,
  };
}

/** 추억 모아보기: 함께한 기록 숫자로 돌아보기 */
export default function DoneStatsScreen() {
  const together = useTogether();
  const items = useBucketStore((s) => s.items);
  // 공간 목록을 아직 못 받았으면 '없음' 대신 불러오는 중·다시 시도
  const sync = useListSync();
  const reviewCtx = useReviewCtx();
  const stats = useMemo(
    () =>
      buildStats(
        items
          .filter((it) => itemStatus(it, reviewCtx) === 'done')
          .map((it) => viewForMe(it, reviewCtx))
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, reviewCtx.userId, reviewCtx.inSpace]
  );

  if (stats.total === 0) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <NavBar title="추억 모아보기" />
        {sync.kind !== 'ok' ? (
          <SyncEmpty sync={sync} />
        ) : (
          <EmptyState
            title="아직 모아볼 기록이 없어요"
            description={`${together ? '함께한 ' : ''}기록이 생기면 여기서 돌아볼 수 있어요.`}
          />
        )}
      </SafeAreaView>
    );
  }

  const maxMonth = Math.max(1, ...stats.months.map((m) => m.count));
  const maxCategory = Math.max(1, ...stats.categories.map((c) => c.count));
  const days = dayjs().diff(dayjs(stats.firstDate), 'day') + 1;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar title="추억 모아보기" />
      <ScrollView contentContainerClassName="gap-4 px-5 pb-10 pt-2">
        {/* 한 줄 요약 */}
        <View className="gap-1 rounded-3xl p-5 bg-accent">
          <Text variant="muted" size={13}>
            {dayjs(stats.firstDate).format('YYYY년 M월 D일')}부터 {days}일 동안
          </Text>
          <Text weight="800" size={26}>
            {`${stats.total}개를 ${together ? '함께 ' : ''}해냈어요`}
          </Text>
          <Text variant="muted" size={13}>
            올해만 {stats.thisYear}개
          </Text>
        </View>

        {/* 숫자 칸 */}
        <View className="flex-row gap-3">
          <StatTile label="가본 곳" value={`${stats.places}`} />
          <StatTile label="해본 것" value={`${stats.activities}`} />
          <StatTile label="평균 별점" value={stats.averageRating.toFixed(1)} />
        </View>

        {/* 월별 */}
        <Section title="최근 1년, 달마다">
          <View
            className="flex-row items-end justify-between"
            style={{ height: BAR_HEIGHT + 36 }}
          >
            {stats.months.map((m, i) => {
              const last = i === stats.months.length - 1;
              return (
                <View key={m.key} className="flex-1 items-center gap-1">
                  <Text size={10} className="text-muted-foreground">
                    {m.count > 0 ? m.count : ''}
                  </Text>
                  <View
                    className={cn(
                      'w-3/5 rounded-t-md',
                      m.count > 0 ? 'bg-primary' : 'bg-accent'
                    )}
                    style={{
                      height: Math.max(4, (m.count / maxMonth) * BAR_HEIGHT),
                      opacity: m.count > 0 && !last ? 0.7 : 1,
                    }}
                  />
                  <Text
                    size={10}
                    weight={last ? '700' : '400'}
                    className={
                      last ? 'text-foreground' : 'text-muted-foreground'
                    }
                  >
                    {m.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </Section>

        {/* 카테고리 */}
        <Section title="많이 한 것">
          <View className="gap-2.5">
            {stats.categories.slice(0, 5).map((c) => (
              <View key={c.key} className="flex-row items-center gap-3">
                <Text size={16}>{c.emoji}</Text>
                <Text size={13} className="w-16" numberOfLines={1}>
                  {c.label}
                </Text>
                <View className="h-2.5 flex-1 overflow-hidden rounded-full bg-accent">
                  <View
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(c.count / maxCategory) * 100}%` }}
                  />
                </View>
                <Text size={13} weight="600" className="w-7 text-right">
                  {c.count}
                </Text>
              </View>
            ))}
          </View>
        </Section>

        {/* 최고였던 것 */}
        <Section title="별점이 높았던 기록">
          <View className="gap-3">
            {stats.best.map((it) => (
              <Pressable
                key={it.id}
                accessibilityRole="button"
                onPress={() =>
                  router.push({ pathname: '/item/[id]', params: { id: it.id } })
                }
                className="flex-row items-center gap-3 active:opacity-70"
              >
                <ItemIcon item={it} size={32} emojiSize={20} bare />
                <View className="flex-1 gap-0.5">
                  <Text weight="600" size={15} numberOfLines={1}>
                    {it.title}
                  </Text>
                  <Text variant="muted" size={12}>
                    {dayjs(it.done!.date).format('YYYY년 M월 D일')}
                  </Text>
                </View>
                <StarRating value={it.done!.rating} size={13} />
              </Pressable>
            ))}
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center gap-1 rounded-2xl py-4 bg-accent">
      <Text weight="800" size={22}>
        {value}
      </Text>
      <Text variant="muted" size={12}>
        {label}
      </Text>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-4 rounded-3xl border p-5 border-border">
      <Text weight="700" size={16}>
        {title}
      </Text>
      {children}
    </View>
  );
}
