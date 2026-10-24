import { router } from 'expo-router';
import { Star } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Icon, Text } from '@/components/atoms';
import { PersonAvatar } from '@/components/space/PersonAvatar';
import { visibleReviews } from '@/lib/bucket/reviews';
import { getCategory, type BucketItem } from '@/lib/bucket/types';
import { showAlert } from '@/lib/dialog';
import { cn } from '@/lib/utils';
import { useBucketStore } from '@/store/useBucketStore';
import { useMemberLookup } from '@/store/useMembersStore';
import { usePrimaryColor } from '@/store/useSettingsStore';

/** 처음에 보여줄 개수 (더 있으면 '모두 보기') */
const PREVIEW_COUNT = 3;

/**
 * 버킷리스트 맨 위: 다른 사람이 먼저 기록해서 내 평가를 기다리는 항목들.
 * 평가하기 → 기록 화면, 건너뛰기 → 별점 없이 함께한 것으로.
 */
export function AwaitingReviews({
  items,
  className,
}: {
  items: BucketItem[];
  /** 바깥 여백 (목록 안에 넣을 때는 목록이 여백을 준다) */
  className?: string;
}) {
  const spaceId = useBucketStore((s) => s.spaceId);
  const saveMyReview = useBucketStore((s) => s.saveMyReview);
  const member = useMemberLookup(spaceId);
  const primary = usePrimaryColor();
  const [showAll, setShowAll] = useState(false);

  if (items.length === 0) return null;
  const shown = showAll ? items : items.slice(0, PREVIEW_COUNT);

  const skip = (item: BucketItem) =>
    showAlert(
      '평가 없이 넘길까요?',
      `'${item.title}'을(를) 별점 없이 함께한 것으로 옮겨요. 나중에 기록 화면에서 평가를 남길 수도 있어요.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '건너뛰기',
          onPress: () => saveMyReview(item.id, { rating: null, review: '' }),
        },
      ]
    );

  return (
    <View
      className={cn(
        'gap-3 rounded-2xl p-4 bg-accent',
        className ?? 'mx-5 mb-4'
      )}
    >
      <View className="gap-0.5">
        <Text weight="700" size={15}>
          평가를 기다려요 · {items.length}
        </Text>
        <Text variant="muted" size={12}>
          다른 사람이 먼저 기록했어요. 내 별점과 소감도 남겨봐요.
        </Text>
      </View>

      {shown.map((item) => {
        const reviews = visibleReviews(item);
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            onPress={() =>
              router.push({ pathname: '/item/[id]', params: { id: item.id } })
            }
            className="gap-2.5 rounded-xl p-3 bg-background active:opacity-80"
          >
            <View className="flex-row items-center gap-2">
              <Text size={18}>{getCategory(item.category).emoji}</Text>
              <Text weight="600" size={15} numberOfLines={1} className="flex-1">
                {item.title}
              </Text>
              {item.done ? (
                <Text variant="muted" size={12}>
                  {item.done.date.replaceAll('-', '.')}
                </Text>
              ) : null}
            </View>

            {reviews.length > 0 ? (
              <View className="flex-row flex-wrap gap-x-3 gap-y-1.5">
                {reviews.slice(0, 3).map((r) => {
                  const who = member(r.userId);
                  return (
                    <View
                      key={r.userId}
                      className="flex-row items-center gap-1.5"
                    >
                      <PersonAvatar imagePath={who.avatarPath} size={18} />
                      <Text size={12} numberOfLines={1}>
                        {who.name}
                      </Text>
                      {r.rating ? (
                        <View className="flex-row items-center gap-0.5">
                          <Icon
                            as={Star}
                            size={12}
                            className="text-primary"
                            fill={primary}
                          />
                          <Text size={12} weight="600">
                            {r.rating}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
                {reviews.length > 3 ? (
                  <Text variant="muted" size={12}>
                    외 {reviews.length - 3}명
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View className="flex-row gap-2">
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: '/record/[id]',
                    params: { id: item.id },
                  })
                }
                className="h-9 flex-1 items-center justify-center rounded-lg bg-primary active:opacity-70"
              >
                <Text
                  weight="600"
                  size={13}
                  className="text-primary-foreground"
                >
                  내 평가 남기기
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => skip(item)}
                className="h-9 items-center justify-center rounded-lg px-4 bg-accent active:opacity-70"
              >
                <Text weight="600" size={13} className="text-muted-foreground">
                  건너뛰기
                </Text>
              </Pressable>
            </View>
          </Pressable>
        );
      })}

      {items.length > PREVIEW_COUNT ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowAll((v) => !v)}
          className="items-center py-1 active:opacity-60"
        >
          <Text weight="600" size={13} className="text-primary">
            {showAll ? '접기' : `모두 보기 (${items.length})`}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
