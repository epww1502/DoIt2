import dayjs from 'dayjs';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NavBar, Text } from '@/components/atoms';
import { EmptyState } from '@/components/bucket/EmptyState';
import { ItemIcon } from '@/components/bucket/ItemIcon';
import { StarRating } from '@/components/bucket/StarRating';
import { PersonAvatar } from '@/components/space/PersonAvatar';
import type { BucketItem, ItemReview } from '@/lib/bucket/types';
import { useBucketStore } from '@/store/useBucketStore';
import { useMemberProfile } from '@/store/useMembersStore';
import { displayName } from '@/store/useProfileStore';

/** 목록마다 보여줄 최대 개수 */
const LIST_MAX = 5;

/**
 * 다른 멤버 프로필: 사진·이름·함께한 날, 그리고 이 공간에서 담은 것·남긴 평가.
 * 지금 공간 기준이고, 폰에 있는 공간 목록으로 센다.
 */
export default function MemberProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const spaceId = useBucketStore((s) => s.spaceId);
  const items = useBucketStore((s) => s.items);
  const profile = useMemberProfile(spaceId, userId);

  const stats = useMemo(() => {
    const added = items
      .filter((it) => it.createdBy === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const reviews: { item: BucketItem; review: ItemReview }[] = [];
    for (const item of items) {
      const review = item.reviews?.find((r) => r.userId === userId);
      if (review) reviews.push({ item, review });
    }
    reviews.sort((a, b) =>
      b.review.updatedAt.localeCompare(a.review.updatedAt)
    );
    const rated = reviews.filter((r) => (r.review.rating ?? 0) > 0);
    const average =
      rated.length > 0
        ? rated.reduce((sum, r) => sum + (r.review.rating ?? 0), 0) /
          rated.length
        : 0;
    return { added, reviews, average };
  }, [items, userId]);

  // 공간을 고르지 않았으면(나만 보기) 볼 멤버가 없다
  if (!spaceId) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <NavBar title="프로필" />
        <EmptyState
          title="공간에서만 볼 수 있어요"
          description="함께 쓰는 공간을 고르면 멤버 프로필을 볼 수 있어요."
        />
      </SafeAreaView>
    );
  }
  if (profile === undefined) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <NavBar title="프로필" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }
  if (profile === null) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <NavBar title="프로필" />
        <EmptyState
          title="이 공간을 나간 멤버예요"
          description="남긴 평가와 댓글은 그대로 남아 있어요."
        />
      </SafeAreaView>
    );
  }

  const name = displayName(profile.nickname);
  const days = dayjs().diff(dayjs(profile.joined_at), 'day') + 1;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar title="프로필" />
      <ScrollView contentContainerClassName="gap-4 px-5 pb-10 pt-2">
        {/* 사진·이름 */}
        <View className="items-center gap-2 rounded-3xl px-5 py-6 bg-accent">
          <PersonAvatar
            imagePath={profile.avatar_path}
            size={88}
            crown={profile.is_owner}
          />
          <Text weight="800" size={22} numberOfLines={1}>
            {name}
          </Text>
          <Text variant="muted" size={13} className="text-center">
            {profile.is_owner ? '공간장 · ' : ''}
            {dayjs(profile.joined_at).format('YYYY년 M월 D일')}부터 함께, {days}
            일째
          </Text>
          {!profile.show_profile ? (
            <Text variant="muted" size={12} className="text-center">
              이 공간에서는 프로필을 공개하지 않았어요
            </Text>
          ) : null}
        </View>

        {/* 숫자 */}
        <View className="flex-row gap-3">
          <StatTile label="담은 것" value={`${stats.added.length}`} />
          <StatTile label="남긴 평가" value={`${stats.reviews.length}`} />
          <StatTile
            label="평균 별점"
            value={stats.average > 0 ? stats.average.toFixed(1) : '-'}
          />
        </View>

        {/* 최근 평가 */}
        <Section title="최근에 남긴 평가">
          {stats.reviews.length === 0 ? (
            <Text variant="muted" size={13}>
              아직 남긴 평가가 없어요
            </Text>
          ) : (
            stats.reviews.slice(0, LIST_MAX).map(({ item, review }) => (
              <ItemLink key={item.id} item={item}>
                <View className="flex-row items-center gap-2">
                  <Text
                    weight="600"
                    size={15}
                    numberOfLines={1}
                    className="flex-1"
                  >
                    {item.title}
                  </Text>
                  {review.rating ? (
                    <StarRating value={review.rating} size={12} />
                  ) : null}
                </View>
                <Text variant="muted" size={12} numberOfLines={2}>
                  {review.review
                    ? `“${review.review}”`
                    : dayjs(review.updatedAt).format('M월 D일')}
                </Text>
              </ItemLink>
            ))
          )}
        </Section>

        {/* 최근에 담은 것 */}
        <Section title="최근에 담은 것">
          {stats.added.length === 0 ? (
            <Text variant="muted" size={13}>
              아직 담은 게 없어요
            </Text>
          ) : (
            stats.added.slice(0, LIST_MAX).map((item) => (
              <ItemLink key={item.id} item={item}>
                <Text weight="600" size={15} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text variant="muted" size={12}>
                  {dayjs(item.createdAt).format('M월 D일')}에 담음
                  {item.done ? ' · 해냈어요' : ''}
                </Text>
              </ItemLink>
            ))
          )}
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
    <View className="gap-3 rounded-3xl border border-border p-5">
      <Text weight="700" size={16}>
        {title}
      </Text>
      {children}
    </View>
  );
}

/** 누르면 그 항목 상세로 */
function ItemLink({
  item,
  children,
}: {
  item: BucketItem;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        router.push({ pathname: '/item/[id]', params: { id: item.id } })
      }
      className="flex-row items-center gap-3 active:opacity-70"
    >
      <ItemIcon item={item} size={40} iconSize={18} bare />
      <View className="flex-1 gap-0.5">{children}</View>
    </Pressable>
  );
}
