import dayjs from 'dayjs';
import { router } from 'expo-router';
import { Star } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon, Text } from '@/components/atoms';
import { PersonAvatar } from '@/components/space/PersonAvatar';
import { useReviewCtx } from '@/hooks/useReviewCtx';
import {
  averageRating,
  myReview,
  ratedReviews,
  visibleReviews,
} from '@/lib/bucket/reviews';
import type { BucketItem, ItemReview } from '@/lib/bucket/types';
import { showAlert } from '@/lib/dialog';
import { cn } from '@/lib/utils';
import { useBucketStore } from '@/store/useBucketStore';
import { useMemberLookup, type MemberInfo } from '@/store/useMembersStore';
import { usePrimaryColor } from '@/store/useSettingsStore';

import { StarRating } from './StarRating';

/**
 * 공간 항목: 사람마다 남긴 별점·소감을 한 화면에.
 * 위에 평균 별점, 내 평가(조금 크게, 없으면 남기기·건너뛰기), 아래에 다른 사람 평가
 */
export function ReviewsSection({ item }: { item: BucketItem }) {
  const ctx = useReviewCtx();
  const spaceId = useBucketStore((s) => s.spaceId);
  const saveMyReview = useBucketStore((s) => s.saveMyReview);
  const member = useMemberLookup(spaceId);
  const primary = usePrimaryColor();

  const mine = myReview(item, ctx.userId);
  const reviews = visibleReviews(item);
  const others = reviews.filter((r) => r.userId !== ctx.userId);
  const rated = ratedReviews(item);
  const average = averageRating(item, ctx);
  // 건너뛴 다른 사람 수 (내가 건너뛴 건 위에 따로 보여준다)
  const skippedCount = (item.reviews ?? []).filter(
    (r) => r.userId !== ctx.userId && r.rating === null && !r.review.trim()
  ).length;

  const goRecord = () =>
    router.push({ pathname: '/record/[id]', params: { id: item.id } });
  const skip = () =>
    showAlert(
      '평가 없이 넘길까요?',
      '별점 없이 함께한 것으로 옮겨요. 나중에 평가를 남길 수도 있어요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '건너뛰기',
          onPress: () => saveMyReview(item.id, { rating: null, review: '' }),
        },
      ]
    );

  return (
    <View className="gap-3">
      <View className="flex-row items-end justify-between">
        <Text weight="700" size={18}>
          모두의 평가
        </Text>
        {average !== null ? (
          <View className="flex-row items-center gap-1">
            <Icon as={Star} size={16} className="text-primary" fill={primary} />
            <Text weight="700" size={16}>
              {average.toFixed(1)}
            </Text>
            <Text variant="muted" size={12}>
              · {rated.length}명
            </Text>
          </View>
        ) : null}
      </View>

      {/* 내 평가 (크게) */}
      {mine && (mine.rating !== null || mine.review.trim()) ? (
        <ReviewCard
          review={mine}
          who={member(mine.userId)}
          big
          onEdit={goRecord}
        />
      ) : mine ? (
        <View className="flex-row items-center justify-between rounded-2xl p-4 bg-accent">
          <Text variant="muted" size={14}>
            평가를 건너뛰었어요
          </Text>
          <Pressable accessibilityRole="button" onPress={goRecord} hitSlop={8}>
            <Text weight="600" size={14} className="text-primary">
              지금 평가하기
            </Text>
          </Pressable>
        </View>
      ) : (
        <View className="gap-3 rounded-2xl border-2 border-primary p-4">
          <Text weight="600" size={15}>
            아직 내 평가가 없어요
          </Text>
          <View className="flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              onPress={goRecord}
              className="h-10 flex-1 items-center justify-center rounded-lg bg-primary active:opacity-70"
            >
              <Text weight="600" size={14} className="text-primary-foreground">
                내 평가 남기기
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={skip}
              className="h-10 items-center justify-center rounded-lg px-4 bg-accent active:opacity-70"
            >
              <Text weight="600" size={14} className="text-muted-foreground">
                건너뛰기
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* 다른 사람 평가 (작게) */}
      {others.length > 0 ? (
        <View className="gap-2">
          <Text weight="600" size={13} className="text-muted-foreground">
            다른 사람의 평가
          </Text>
          {others.map((r) => (
            <ReviewCard key={r.userId} review={r} who={member(r.userId)} />
          ))}
        </View>
      ) : null}

      {skippedCount > 0 ? (
        <Text variant="muted" size={12}>
          {skippedCount}명은 평가를 건너뛰었어요
        </Text>
      ) : null}
    </View>
  );
}

/** 한 사람의 평가 카드. big이면 내 평가처럼 크게 */
function ReviewCard({
  review,
  who,
  big,
  onEdit,
}: {
  review: ItemReview;
  who: MemberInfo;
  big?: boolean;
  onEdit?: () => void;
}) {
  return (
    <View
      className={cn(
        'gap-2 rounded-2xl border border-border bg-card',
        big ? 'p-5' : 'p-4'
      )}
    >
      <View className="flex-row items-center gap-2.5">
        <PersonAvatar imagePath={who.avatarPath} size={big ? 36 : 28} />
        <View className="flex-1 gap-0.5">
          <Text weight="600" size={big ? 16 : 14} numberOfLines={1}>
            {who.name}
          </Text>
          <Text variant="muted" size={11}>
            {dayjs(review.updatedAt).format('M월 D일')}
          </Text>
        </View>
        {review.rating ? (
          <StarRating value={review.rating} size={big ? 20 : 14} />
        ) : (
          <Text variant="muted" size={12}>
            별점 없음
          </Text>
        )}
      </View>
      {review.review ? (
        <Text size={big ? 16 : 14}>“{review.review}”</Text>
      ) : null}
      {onEdit ? (
        <Pressable
          accessibilityRole="button"
          onPress={onEdit}
          hitSlop={8}
          className="self-end active:opacity-60"
        >
          <Text weight="600" size={13} className="text-primary">
            내 평가 고치기
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
