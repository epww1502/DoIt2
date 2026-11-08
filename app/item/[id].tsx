import dayjs from 'dayjs';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ExternalLink,
  Flag,
  MapPin,
  Pencil,
  Repeat,
  Trash2,
} from 'lucide-react-native';
import { Pressable, ScrollView, View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { useTogether } from '@/hooks/useTogether';
import { useItemWants } from '@/hooks/useItemWants';
import { WantRow } from '@/components/bucket/WantButton';
import { useMemberLookup } from '@/store/useMembersStore';
import { showAlert } from '@/lib/dialog';
import { Badge, Button, Icon, NavBar, Text } from '@/components/atoms';
import { ItemIcon } from '@/components/bucket/ItemIcon';
import { BottomBar } from '@/components/bucket/BottomBar';
import { DonePhotoGallery } from '@/components/bucket/DonePhoto';
import { LinkCard } from '@/components/bucket/LinkCard';
import { RecordAlbum } from '@/components/bucket/RecordAlbum';
import { TodoChecklist } from '@/components/bucket/TodoChecklist';
import { StartedCard } from '@/components/bucket/StartedCard';
import { EmptyState } from '@/components/bucket/EmptyState';
import { SyncEmpty, useListSync } from '@/components/bucket/SyncNotice';
import { ItemSocial } from '@/components/bucket/ItemSocial';
import { ReviewsSection } from '@/components/bucket/ReviewsSection';
import { useKeyboardAwareForm } from '@/hooks/useKeyboardHeight';
import { StarRating } from '@/components/bucket/StarRating';
import { useReviewCtx } from '@/hooks/useReviewCtx';
import { goalDday } from '@/components/bucket/goalDday';
import {
  getCategory,
  GOAL_REMIND_META,
  isResting,
  itemPhotos,
  KIND_META,
  SETTING_META,
} from '@/lib/bucket/types';
import { openMapTarget } from '@/lib/openPlace';
import { todayKey } from '@/lib/date';
import { doneDateLabel } from '@/lib/bucket/doneDate';
import { formatWon } from '@/lib/bucket/cost';
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
  // 댓글 입력칸이 키보드에 가리지 않게
  const { keyboardHeight, scrollRef, onScroll, ensureFocusedVisible } =
    useKeyboardAwareForm();
  const spaceId = useBucketStore((s) => s.spaceId);
  const updateItem = useBucketStore((s) => s.updateItem);
  // 하고 싶어요 (함께 쓰는 공간에서만)
  const wants = useItemWants(together ? spaceId : null);
  const member = useMemberLookup(spaceId);

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
  const photos = itemPhotos(item);
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
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-6 px-5"
        // 아래 버튼이 없을 때(기록 있음)는 휴대폰 아래 바만큼 더 띄운다. 키보드가 올라오면 그만큼 더
        contentContainerStyle={{
          paddingBottom: (done ? insets.bottom : 0) + 40 + keyboardHeight,
        }}
      >
        <View className="items-center gap-3 pt-4">
          <ItemIcon item={item} size={80} iconSize={36} />
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

        {/* 항목 사진 (첫 장이 대표). 옆으로 넘겨 본다 */}
        {photos.length > 0 ? (
          <View className="overflow-hidden rounded-2xl">
            <DonePhotoGallery done={{ photoUri: null, photos }} />
          </View>
        ) : null}

        {/* 함께 쓰는 공간: 하고 싶어요 (아직 안 한 것만) */}
        {together && !done ? (
          <WantRow
            mine={wants.wantedByMe(item.id)}
            wanters={wants.wantersOf(item.id).map(member)}
            onPress={() => void wants.toggle(item.id)}
          />
        ) : null}

        {/* 시작하기를 눌렀으면 며칠째인지 */}
        <StartedCard item={item} />

        {/* 할 것 체크리스트 (없으면 '+ 할 것 추가'만) */}
        <TodoChecklist item={item} onRecord={goRecord} />

        {/* 매년 하기 (쉬는 중이면 언제 다시 올라오는지와 지금 꺼내기) */}
        {item.repeat && !done ? (
          <View className="flex-row items-center gap-3 rounded-2xl p-4 bg-accent">
            <Icon as={Repeat} size={18} className="text-primary" />
            <View className="flex-1 gap-0.5">
              <Text weight="600" size={15}>
                매년 하기
              </Text>
              <Text variant="muted" size={12}>
                {isResting(item, dayjs().format('YYYY-MM-DD'))
                  ? `쉬는 중이에요. ${dayjs(item.repeat.restUntil).format('YYYY년 M월 D일')}에 목록에 다시 올라와요`
                  : '해내면 내년 이맘때 한 달 전에 다시 올라와요'}
              </Text>
            </View>
            {isResting(item, dayjs().format('YYYY-MM-DD')) ? (
              <Pressable
                accessibilityRole="button"
                hitSlop={6}
                onPress={() =>
                  updateItem(item.id, {
                    repeat: { every: 'year', restUntil: null },
                  })
                }
                className="rounded-full bg-primary px-3 py-1.5 active:opacity-70"
              >
                <Text
                  weight="600"
                  size={12}
                  className="text-primary-foreground"
                >
                  지금 꺼내기
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

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

        {/* 누르면 지도 앱으로 (안드로이드는 폰이 앱을 고르게, 아이폰은 지도 앱 목록) */}
        {mapTarget ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="지도 앱에서 보기"
            onPress={() => openMapTarget(mapTarget)}
            className="flex-row items-center gap-3 rounded-2xl p-4 bg-accent active:opacity-70"
          >
            <Icon as={MapPin} size={18} className="text-primary" />
            <View className="flex-1 gap-0.5">
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
            <Icon as={ExternalLink} size={18} className="text-primary" />
          </Pressable>
        ) : null}

        {item.memo ? (
          <View className="gap-1 rounded-2xl p-4 bg-accent">
            <Text weight="600" size={13} className="text-muted-foreground">
              메모
            </Text>
            <Text variant="body">{item.memo}</Text>
          </View>
        ) : null}

        {/* 참고 링크 (누르면 열린다) */}
        {item.links?.length ? (
          <View className="gap-1.5">
            <Text weight="600" size={13} className="text-muted-foreground">
              링크
            </Text>
            {item.links.map((link) => (
              <LinkCard key={link.url} link={link} />
            ))}
          </View>
        ) : null}

        {done ? (
          <View className="gap-3">
            <Text weight="700" size={18}>
              {together ? '우리의 기록' : '나의 기록'}
            </Text>
            <View className="overflow-hidden rounded-2xl border border-border bg-card">
              {inSpace ? (
                <RecordAlbum item={item} />
              ) : (
                <DonePhotoGallery done={done} />
              )}
              <View className="gap-2 p-4">
                <View className="flex-row items-center justify-between">
                  <Text weight="600" className="flex-shrink">
                    {doneDateLabel(done, 'long')}
                  </Text>
                  {!inSpace ? <StarRating value={done.rating} /> : null}
                </View>
                {!inSpace && done.review ? (
                  <Text variant="body">“{done.review}”</Text>
                ) : null}
                {done.cost ? (
                  <Text variant="muted" size={13}>
                    {`${inSpace ? '함께 쓴 돈' : '쓴 돈'} ${formatWon(done.cost)}`}
                  </Text>
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

        {/* 공간 항목: 이모지 반응과 댓글 */}
        {inSpace && spaceId ? (
          <View className="border-t border-border pt-6">
            <ItemSocial
              itemId={item.id}
              spaceId={spaceId}
              onInputFocus={ensureFocusedVisible}
            />
          </View>
        ) : null}
      </ScrollView>

      {/* 댓글을 쓰는 동안(키보드가 올라와 있을 때)은 아래 버튼을 숨긴다 */}
      {!done && keyboardHeight === 0 ? (
        <BottomBar>
          {item.started ? (
            <Button
              label={`${meta.doneLabel} 기록 남기기`}
              onPress={goRecord}
            />
          ) : (
            // 며칠 걸리는 일은 먼저 시작하기, 바로 해냈으면 기록 남기기
            <View className="flex-row gap-2">
              <Button
                label="시작하기"
                variant="outline"
                className="px-6"
                onPress={() =>
                  updateItem(item.id, { started: { date: todayKey() } })
                }
              />
              <Button
                label={`${meta.doneLabel} 기록 남기기`}
                className="flex-1"
                onPress={goRecord}
              />
            </View>
          )}
        </BottomBar>
      ) : null}
    </SafeAreaView>
  );
}
