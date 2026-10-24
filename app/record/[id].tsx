import dayjs from 'dayjs';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  X,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTogether } from '@/hooks/useTogether';
import { showAlert } from '@/lib/dialog';
import { Button, Icon, NavBar, Text } from '@/components/atoms';
import { TextArea } from '@/components/atoms/TextArea';
import { BottomBar } from '@/components/bucket/BottomBar';
import { DatePickerSheet } from '@/components/bucket/DatePickerSheet';
import { EmptyState } from '@/components/bucket/EmptyState';
import { FieldLabel } from '@/components/bucket/FieldLabel';
import { PlaceField } from '@/components/bucket/PlaceField';
import { usePhotoSource } from '@/components/bucket/DonePhoto';
import { StarRating } from '@/components/bucket/StarRating';
import { useKeyboardAwareForm } from '@/hooks/useKeyboardHeight';
import { DATE_FORMAT, todayKey } from '@/lib/date';
import { deletePhoto, pickPhotos } from '@/lib/bucket/photo';
import {
  KIND_META,
  MAX_RECORD_PHOTOS,
  recordPhotos,
  withRecordPhotos,
  type PlaceInfo,
  type RecordPhoto,
} from '@/lib/bucket/types';
import { useBucketItem, useBucketStore } from '@/store/useBucketStore';
import { useMemberLookup } from '@/store/useMembersStore';
import { PersonAvatar } from '@/components/space/PersonAvatar';
import { useReviewCtx } from '@/hooks/useReviewCtx';
import { myReview, visibleReviews } from '@/lib/bucket/reviews';
import { showErrorAlert } from '@/lib/errors';
import { usePlacePickStore } from '@/store/usePlacePickStore';

const RATING_LABELS = [
  '',
  '별로였어요',
  '그저 그랬어요',
  '괜찮았어요',
  '좋았어요',
  '최고였어요!',
];

/** 함께한 기록 남기기 / 수정 */
export default function RecordFormScreen() {
  const together = useTogether();
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useBucketItem(id);
  const recordDone = useBucketStore((state) => state.recordDone);
  const saveMyReview = useBucketStore((state) => state.saveMyReview);
  const saved = item?.done;
  const { keyboardHeight, scrollRef, onScroll, ensureFocusedVisible } =
    useKeyboardAwareForm();
  // 공간에서는 날짜·사진은 함께, 별점·소감은 내 것만 고친다
  const reviewCtx = useReviewCtx();
  const inSpace = reviewCtx.inSpace;
  const mine = item ? myReview(item, reviewCtx.userId) : null;
  /** 다른 사람이 먼저 기록했고 나는 아직 평가 전 */
  const awaitingMine = inSpace && Boolean(saved) && !mine;
  const others = item
    ? visibleReviews(item).filter((r) => r.userId !== reviewCtx.userId)
    : [];
  const member = useMemberLookup(useBucketStore((s) => s.spaceId));

  const [date, setDate] = useState(saved?.date ?? todayKey());
  const [rating, setRating] = useState(
    (inSpace ? mine?.rating : saved?.rating) ?? 5
  );
  const [review, setReview] = useState(
    (inSpace ? mine?.review : saved?.review) ?? ''
  );
  // 사진들. uri: 이 휴대폰의 사진 파일, path: 서버에 올라간 사진 (상대가 올린 사진이면 path만 있다)
  const [photos, setPhotos] = useState<RecordPhoto[]>(() =>
    recordPhotos(saved)
  );
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  // 장소 (항목에 붙어 있는 값). 기록하면서 새로 붙이거나 바꿀 수 있다
  const updateItem = useBucketStore((state) => state.updateItem);
  const [place, setPlace] = useState<PlaceInfo | null>(item?.place ?? null);
  const [location, setLocation] = useState(item?.location ?? '');

  // 장소 검색 화면에서 고르고 돌아오면 받아서 채운다
  const takePicked = usePlacePickStore((state) => state.take);
  useFocusEffect(
    useCallback(() => {
      const picked = takePicked();
      if (!picked) return;
      setPlace(picked);
      setLocation(picked.address);
    }, [takePicked])
  );

  if (!item) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <NavBar />
        <EmptyState
          emoji="🫥"
          title="찾을 수 없어요"
          description="이미 지운 항목일 수 있어요."
        />
      </SafeAreaView>
    );
  }

  const isToday = date === todayKey();
  const moveDate = (days: number) =>
    setDate(dayjs(date).add(days, 'day').format(DATE_FORMAT));

  /** 이번 화면에서 새로 고른 사진이면 지운다 (저장된 사진은 저장할 때 정리) */
  const savedUris = new Set(recordPhotos(saved).map((p) => p.uri));
  const discardNewPhoto = (uri: string | null) => {
    if (uri && !savedUris.has(uri)) deletePhoto(uri);
  };

  const addPhotos = async () => {
    try {
      const uris = await pickPhotos(MAX_RECORD_PHOTOS - photos.length);
      if (uris.length === 0) return;
      // 새 사진은 아직 서버 경로가 없다 (저장할 때 올린다)
      setPhotos((prev) => [
        ...prev,
        ...uris.map((uri) => ({ uri, path: null })),
      ]);
    } catch {
      showAlert('사진을 불러오지 못했어요', '잠시 후 다시 시도해주세요.');
    }
  };

  const removePhotoAt = (index: number) => {
    discardNewPhoto(photos[index]?.uri ?? null);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const cancel = () => {
    for (const photo of photos) discardNewPhoto(photo.uri);
    router.back();
  };

  const openSearch = () =>
    router.push({
      pathname: '/item/search-place',
      params: { q: place?.name ?? (location.trim() || item.title) },
    });

  const clearPlace = () => {
    setPlace(null);
    setLocation('');
  };

  const save = async () => {
    setSaving(true);
    try {
      // 장소가 바뀌었으면 항목에 먼저 반영한다 (기록 저장이 같은 항목을 서버에 올린다)
      const nextLocation = location.trim();
      if (place !== item.place || nextLocation !== item.location) {
        updateItem(item.id, { place, location: nextLocation });
      }
      await recordDone(
        item.id,
        withRecordPhotos(
          { date, rating, review: review.trim(), photoUri: null },
          photos
        )
      );
      router.back();
    } catch (e) {
      showErrorAlert('저장하지 못했어요', e, save);
    } finally {
      setSaving(false);
    }
  };

  /** 다른 사람이 남긴 기록에 내 평가 없이 함께한 것으로 넘기기 */
  const skip = () => {
    for (const photo of photos) discardNewPhoto(photo.uri);
    saveMyReview(item.id, { rating: null, review: '' });
    router.back();
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar
        title={
          awaitingMine
            ? '내 평가 남기기'
            : saved
              ? '기록 수정'
              : together
                ? '함께한 기록'
                : '기록 남기기'
        }
        onBack={cancel}
      />
      {/* 키보드 높이만큼 아래를 비워서 입력칸과 버튼을 키보드 위로 올린다 */}
      <View className="flex-1" style={{ paddingBottom: keyboardHeight }}>
        <ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerClassName="gap-7 px-5 pb-8 pt-2"
          keyboardShouldPersistTaps="handled"
        >
          <Text weight="700" size={22}>
            {item.title}, 어땠어요?
          </Text>

          <View>
            <FieldLabel>{KIND_META[item.kind].whenQuestion}</FieldLabel>
            <View className="h-12 flex-row items-center justify-between rounded-xl px-2 bg-accent">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="하루 전"
                hitSlop={6}
                onPress={() => moveDate(-1)}
                className="h-10 w-10 items-center justify-center"
              >
                <Icon as={ChevronLeft} size={20} />
              </Pressable>
              {/* 날짜를 누르면 달력이 열린다 (일 → 월 → 연으로 넓혀 고를 수 있다) */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="날짜 고르기"
                hitSlop={6}
                onPress={() => setPickerOpen(true)}
                className="h-10 flex-1 flex-row items-center justify-center gap-1.5 active:opacity-60"
              >
                <Icon
                  as={CalendarDays}
                  size={16}
                  className="text-muted-foreground"
                />
                <Text weight="600" size={16}>
                  {dayjs(date).format('YYYY년 M월 D일 (dd)')}
                  {isToday ? ' · 오늘' : ''}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="하루 뒤"
                hitSlop={6}
                disabled={isToday}
                onPress={() => moveDate(1)}
                className="h-10 w-10 items-center justify-center"
              >
                <Icon
                  as={ChevronRight}
                  size={20}
                  className={isToday ? 'text-muted' : 'text-foreground'}
                />
              </Pressable>
            </View>
          </View>

          <PlaceField
            label={KIND_META[item.kind].locationLabel}
            placeholder={KIND_META[item.kind].locationPlaceholder}
            place={place}
            location={location}
            onChangeLocation={setLocation}
            onSearch={openSearch}
            onClear={clearPlace}
            onFocus={ensureFocusedVisible}
          />

          {others.length > 0 ? (
            // 먼저 남긴 다른 사람들의 평가 (참고용)
            <View className="gap-2 rounded-2xl p-4 bg-accent">
              <Text weight="600" size={13} className="text-muted-foreground">
                다른 사람의 평가
              </Text>
              {others.map((r) => {
                const who = member(r.userId);
                return (
                  <View key={r.userId} className="flex-row items-start gap-2">
                    <PersonAvatar imagePath={who.avatarPath} size={24} />
                    <View className="flex-1 gap-0.5">
                      <View className="flex-row items-center gap-2">
                        <Text weight="600" size={13}>
                          {who.name}
                        </Text>
                        {r.rating ? (
                          <StarRating value={r.rating} size={12} />
                        ) : null}
                      </View>
                      {r.review ? <Text size={13}>{r.review}</Text> : null}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}

          <View className="items-center gap-2">
            {inSpace ? (
              <Text variant="muted" size={13}>
                내 별점
              </Text>
            ) : null}
            <StarRating value={rating} onChange={setRating} size={36} />
            <Text weight="600" className="text-primary">
              {RATING_LABELS[rating]}
            </Text>
          </View>

          <View>
            <FieldLabel>{inSpace ? '내 한 줄 소감' : '한 줄 후기'}</FieldLabel>
            <TextArea
              value={review}
              onChangeText={setReview}
              placeholder="오늘의 한 줄을 남겨봐요"
              maxLength={200}
              onFocus={ensureFocusedVisible}
            />
          </View>

          <View>
            <FieldLabel>{`사진 (선택, ${photos.length}/${MAX_RECORD_PHOTOS})`}</FieldLabel>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2"
            >
              {photos.map((photo, i) => (
                <PhotoThumb
                  key={photo.path ?? photo.uri ?? i}
                  photo={photo}
                  first={i === 0}
                  onRemove={() => removePhotoAt(i)}
                />
              ))}
              {photos.length < MAX_RECORD_PHOTOS ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="사진 추가하기"
                  onPress={() => void addPhotos()}
                  className="items-center justify-center gap-1 rounded-2xl border border-dashed border-muted active:opacity-70"
                  style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
                >
                  <Icon
                    as={ImagePlus}
                    size={24}
                    className="text-muted-foreground"
                  />
                  <Text variant="muted" size={12}>
                    사진 추가
                  </Text>
                </Pressable>
              ) : null}
            </ScrollView>
            {photos.length > 1 ? (
              <Text size={12} className="mt-2 text-muted-foreground">
                첫 번째 사진이 목록에 대표로 보여요
              </Text>
            ) : null}
          </View>
        </ScrollView>

        <BottomBar>
          <Button
            label={
              saving
                ? '저장하는 중…'
                : awaitingMine
                  ? '내 평가 저장하기'
                  : '기록 저장하기'
            }
            disabled={saving}
            onPress={() => void save()}
          />
          {awaitingMine ? (
            <Button
              label="평가 없이 넘기기"
              variant="ghost"
              size="md"
              disabled={saving}
              onPress={skip}
            />
          ) : null}
        </BottomBar>
      </View>
      <DatePickerSheet
        visible={pickerOpen}
        value={date}
        onChange={setDate}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

/** 사진 칸 크기 */
const THUMB_SIZE = 96;

/** 기록 사진 한 칸: 오른쪽 위 X로 빼고, 첫 장엔 '대표' 표시 */
function PhotoThumb({
  photo,
  first,
  onRemove,
}: {
  photo: RecordPhoto;
  first: boolean;
  onRemove: () => void;
}) {
  const uri = usePhotoSource(photo.uri, photo.path);
  return (
    <View
      className="overflow-hidden rounded-2xl bg-accent"
      style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
    >
      <Image
        source={uri ? { uri } : undefined}
        style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
        contentFit="cover"
      />
      {first ? (
        <View className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-2 py-0.5">
          <Text size={10} weight="600" className="text-white">
            대표
          </Text>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="사진 빼기"
        hitSlop={6}
        onPress={onRemove}
        className="absolute right-1.5 top-1.5 h-6 w-6 items-center justify-center rounded-full bg-black/60"
      >
        <Icon as={X} size={14} className="text-white" />
      </Pressable>
    </View>
  );
}
