import dayjs from 'dayjs';
import { router, useLocalSearchParams } from 'expo-router';
import { Flag, MapPin, Pencil, Trash2 } from 'lucide-react-native';
import { Pressable, ScrollView, View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { useTogether } from '@/hooks/useTogether';
import { showAlert } from '@/lib/dialog';
import { Badge, Button, Icon, NavBar, Text } from '@/components/atoms';
import { BottomBar } from '@/components/bucket/BottomBar';
import { DonePhotoGallery } from '@/components/bucket/DonePhoto';
import { EmptyState } from '@/components/bucket/EmptyState';
import { SyncEmpty, useListSync } from '@/components/bucket/SyncNotice';
import { MapAppButtons } from '@/components/bucket/MapAppButtons';
import { ReviewsSection } from '@/components/bucket/ReviewsSection';
import { StarRating } from '@/components/bucket/StarRating';
import { useReviewCtx } from '@/hooks/useReviewCtx';
import { goalDday } from '@/components/bucket/goalDday';
import {
  getCategory,
  GOAL_REMIND_META,
  KIND_META,
  SETTING_META,
} from '@/lib/bucket/types';
import { openInMap } from '@/lib/mapLinks';
import { useBucketItem, useBucketStore } from '@/store/useBucketStore';

export default function BucketDetailScreen() {
  const together = useTogether();
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useBucketItem(id);
  const removeItems = useBucketStore((state) => state.removeItems);
  const clearDone = useBucketStore((state) => state.clearDone);
  // 알림을 눌러 바로 들어왔을 때 목록을 아직 못 받았으면 '찾을 수 없어요' 대신 기다리거나 다시 시도
  const sync = useListSync();
  // 공간이면 별점·소감은 사람마다 따로 (아래 '모두의 평가')
  const reviewCtx = useReviewCtx();
  const inSpace = reviewCtx.inSpace;
  const insets = useSafeAreaInsets();

  if (!item) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <NavBar />
        {sync.kind !== 'ok' ? (
          <SyncEmpty sync={sync} />
        ) : (
          <EmptyState
            emoji="🫥"
            title="찾을 수 없어요"
            description="이미 지운 항목일 수 있어요."
          />
        )}
      </SafeAreaView>
    );
  }

  const category = getCategory(item.category);
  const meta = KIND_META[item.kind];
  const done = item.done;
  // 카카오에서 고른 장소가 있으면 그 장소로, 없으면 적어 둔 위치 글자로 검색해서 연다
  const mapTarget = item.place
    ? ({ type: 'place', place: item.place } as const)
    : item.location
      ? ({ type: 'search', query: item.location } as const)
      : null;

  const confirmRemove = () => {
    showAlert(
      '버킷리스트에서 지울까요?',
      together
        ? '함께한 기록과 사진도 같이 지워져요.'
        : '기록과 사진도 같이 지워져요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '지우기',
          style: 'destructive',
          onPress: () => {
            router.back();
            removeItems([item.id]);
          },
        },
      ]
    );
  };

  // 공간에서 다른 사람 평가가 남아 있으면 내 평가만 지운다
  const othersReviewed = (item.reviews ?? []).some(
    (r) => r.userId !== reviewCtx.userId
  );
  const onlyMine = inSpace && othersReviewed;
  const confirmClearDone = () => {
    showAlert(
      onlyMine ? '내 평가를 지울까요?' : '기록을 지울까요?',
      onlyMine
        ? '다른 사람의 평가와 날짜·사진은 그대로 남아요. 이 항목은 다시 평가를 기다려요.'
        : '다시 버킷리스트로 돌아가요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '지우기',
          style: 'destructive',
          onPress: () => clearDone(item.id),
        },
      ]
    );
  };

  const goRecord = () =>
    router.push({ pathname: '/record/[id]', params: { id: item.id } });

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar
        right={
          <View className="flex-row">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="수정"
              hitSlop={6}
              onPress={() =>
                router.push({ pathname: '/item/new', params: { id: item.id } })
              }
              className="h-10 w-10 items-center justify-center"
            >
              <Icon as={Pencil} size={20} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="삭제"
              hitSlop={6}
              onPress={confirmRemove}
              className="h-10 w-10 items-center justify-center"
            >
              <Icon as={Trash2} size={20} className="text-destructive" />
            </Pressable>
          </View>
        }
      />

      <ScrollView
        contentContainerClassName="gap-6 px-5"
        // 아래 버튼이 없을 때(기록 있음)는 휴대폰 아래 바만큼 더 띄운다
        contentContainerStyle={{
          paddingBottom: (done ? insets.bottom : 0) + 40,
        }}
      >
        <View className="items-center gap-3 pt-4">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-accent">
            <Text size={40}>{category.emoji}</Text>
          </View>
          <Badge variant="primary">
            <Text>
              {meta.label} · {category.label} ·{' '}
              {SETTING_META[item.setting].label}
            </Text>
          </Badge>
          <Text weight="700" size={24} className="text-center">
            {item.title}
          </Text>
          {item.location ? (
            <View className="flex-row items-center gap-1">
              <Icon as={MapPin} size={14} className="text-muted-foreground" />
              <Text variant="muted">{item.location}</Text>
            </View>
          ) : null}
          <Text variant="muted" size={12}>
            {dayjs(item.createdAt).format('YYYY년 M월 D일')}에 담았어요
          </Text>
        </View>

        {item.goal ? (
          <View className="flex-row items-center gap-3 rounded-2xl p-4 bg-accent">
            <Icon as={Flag} size={18} className="text-primary" />
            <View className="flex-1 gap-0.5">
              <Text weight="600" size={13} className="text-muted-foreground">
                목표 날짜
              </Text>
              <Text weight="600" size={15}>
                {dayjs(item.goal.date).format('YYYY년 M월 D일 (dd)')}
              </Text>
              <Text variant="muted" size={12}>
                {item.goal.remind.length > 0
                  ? `알림: ${item.goal.remind.map((k) => GOAL_REMIND_META[k].label).join(', ')}`
                  : '알림 없음'}
              </Text>
            </View>
            {!done ? (
              <Text weight="700" size={16} className="text-primary">
                {goalDday(item.goal.date)}
              </Text>
            ) : null}
          </View>
        ) : null}

        {mapTarget ? (
          <View className="gap-3 rounded-2xl p-4 bg-accent">
            <View className="gap-0.5">
              <Text weight="600" size={13} className="text-muted-foreground">
                지도에서 보기
              </Text>
              {item.place ? (
                <>
                  <Text weight="600" size={15}>
                    {item.place.name}
                  </Text>
                  <Text variant="muted" size={12}>
                    {item.place.address}
                  </Text>
                </>
              ) : (
                <Text variant="muted" size={12}>
                  &apos;{item.location}&apos;(으)로 검색해서 열어요
                </Text>
              )}
            </View>
            <MapAppButtons onOpen={(app) => void openInMap(app, mapTarget)} />
          </View>
        ) : null}

        {item.memo ? (
          <View className="gap-1 rounded-2xl p-4 bg-accent">
            <Text weight="600" size={13} className="text-muted-foreground">
              메모
            </Text>
            <Text variant="body">{item.memo}</Text>
          </View>
        ) : null}

        {done ? (
          <View className="gap-3">
            <Text weight="700" size={18}>
              {together ? '우리의 기록' : '나의 기록'}
            </Text>
            <View className="overflow-hidden rounded-2xl border bg-card border-border">
              <DonePhotoGallery done={done} />
              <View className="gap-2 p-4">
                <View className="flex-row items-center justify-between">
                  <Text weight="600">
                    {dayjs(done.date).format('YYYY년 M월 D일 (dd)')}
                  </Text>
                  {!inSpace ? <StarRating value={done.rating} /> : null}
                </View>
                {!inSpace && done.review ? (
                  <Text variant="body">“{done.review}”</Text>
                ) : null}
              </View>
            </View>
            {inSpace ? <ReviewsSection item={item} /> : null}
            <Button
              label="공유 카드 만들기"
              size="md"
              onPress={() =>
                router.push({
                  pathname: '/share/[id]',
                  params: { id: item.id },
                })
              }
            />
            <View className="flex-row gap-2">
              <Button
                label="기록 수정"
                variant="outline"
                size="md"
                className="flex-1"
                onPress={goRecord}
              />
              <Button
                label={onlyMine ? '내 평가 지우기' : '기록 지우기'}
                variant="ghost"
                size="md"
                className="flex-1"
                onPress={confirmClearDone}
              />
            </View>
          </View>
        ) : null}
      </ScrollView>

      {!done ? (
        <BottomBar>
          <Button label={`${meta.doneLabel} 기록 남기기`} onPress={goRecord} />
        </BottomBar>
      ) : null}
    </SafeAreaView>
  );
}
