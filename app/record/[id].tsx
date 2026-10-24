import dayjs from 'dayjs';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  X,
} from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Icon, NavBar, Text } from '@/components/atoms';
import { TextArea } from '@/components/atoms/TextArea';
import { BottomBar } from '@/components/bucket/BottomBar';
import { DatePickerSheet } from '@/components/bucket/DatePickerSheet';
import { EmptyState } from '@/components/bucket/EmptyState';
import { FieldLabel } from '@/components/bucket/FieldLabel';
import { usePhotoSource } from '@/components/bucket/DonePhoto';
import { StarRating } from '@/components/bucket/StarRating';
import { useKeyboardAwareForm } from '@/hooks/useKeyboardHeight';
import { DATE_FORMAT, todayKey } from '@/lib/date';
import { deletePhoto, pickPhoto } from '@/lib/bucket/photo';
import { KIND_META } from '@/lib/bucket/types';
import { useBucketItem, useBucketStore } from '@/store/useBucketStore';

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
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useBucketItem(id);
  const recordDone = useBucketStore((state) => state.recordDone);
  const saved = item?.done;
  const { keyboardHeight, scrollRef, onScroll, ensureFocusedVisible } =
    useKeyboardAwareForm();

  const [date, setDate] = useState(saved?.date ?? todayKey());
  const [rating, setRating] = useState(saved?.rating ?? 5);
  const [review, setReview] = useState(saved?.review ?? '');
  // uri: 이 휴대폰의 사진 파일, path: 서버에 올라간 사진 (상대가 올린 사진이면 path만 있다)
  const [photo, setPhoto] = useState<{
    uri: string | null;
    path: string | null;
  }>({ uri: saved?.photoUri ?? null, path: saved?.photoPath ?? null });
  const photoSource = usePhotoSource(photo.uri, photo.path);
  const hasPhoto = Boolean(photo.uri || photo.path);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

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
  const discardNewPhoto = (uri: string | null) => {
    if (uri && uri !== saved?.photoUri) deletePhoto(uri);
  };

  const choosePhoto = async () => {
    try {
      const uri = await pickPhoto();
      if (!uri) return;
      discardNewPhoto(photo.uri);
      // 새 사진은 아직 서버 경로가 없다 (저장할 때 올린다)
      setPhoto({ uri, path: null });
    } catch {
      Alert.alert('사진을 불러오지 못했어요', '잠시 후 다시 시도해주세요.');
    }
  };

  const removePhoto = () => {
    discardNewPhoto(photo.uri);
    setPhoto({ uri: null, path: null });
  };

  const cancel = () => {
    discardNewPhoto(photo.uri);
    router.back();
  };

  const save = async () => {
    setSaving(true);
    try {
      await recordDone(item.id, {
        date,
        rating,
        review: review.trim(),
        photoUri: photo.uri,
        photoPath: photo.path,
      });
      router.back();
    } catch {
      Alert.alert(
        '저장하지 못했어요',
        '인터넷 연결을 확인하고 다시 시도해주세요.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar title={saved ? '기록 수정' : '함께한 기록'} onBack={cancel} />
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

          <View className="items-center gap-2">
            <StarRating value={rating} onChange={setRating} size={36} />
            <Text weight="600" className="text-primary">
              {RATING_LABELS[rating]}
            </Text>
          </View>

          <View>
            <FieldLabel>한 줄 후기</FieldLabel>
            <TextArea
              value={review}
              onChangeText={setReview}
              placeholder="오늘의 한 줄을 남겨봐요"
              maxLength={200}
              onFocus={ensureFocusedVisible}
            />
          </View>

          <View>
            <FieldLabel>사진 (선택)</FieldLabel>
            {hasPhoto ? (
              <View className="overflow-hidden rounded-2xl bg-accent">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="사진 바꾸기"
                  onPress={choosePhoto}
                >
                  <Image
                    source={photoSource ? { uri: photoSource } : undefined}
                    style={{ width: '100%', aspectRatio: 4 / 3 }}
                    contentFit="cover"
                  />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="사진 빼기"
                  onPress={removePhoto}
                  className="absolute right-3 top-3 h-8 w-8 items-center justify-center rounded-full bg-black/60"
                >
                  <Icon as={X} size={18} className="text-white" />
                </Pressable>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={choosePhoto}
                className="h-32 items-center justify-center gap-2 rounded-2xl border border-dashed border-muted active:opacity-70"
              >
                <Icon
                  as={ImagePlus}
                  size={28}
                  className="text-muted-foreground"
                />
                <Text variant="muted">사진 추가하기</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>

        <BottomBar>
          <Button
            label={saving ? '저장하는 중…' : '기록 저장하기'}
            disabled={saving}
            onPress={() => void save()}
          />
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
