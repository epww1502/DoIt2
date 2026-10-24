import dayjs from 'dayjs';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ChevronRight, ImagePlus, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Icon, NavBar, Text } from '@/components/atoms';
import { TextArea } from '@/components/atoms/TextArea';
import { EmptyState } from '@/components/place/EmptyState';
import { FieldLabel } from '@/components/place/FieldLabel';
import { StarRating } from '@/components/place/StarRating';
import { DATE_FORMAT, todayKey } from '@/lib/date';
import { deletePhoto, pickPhoto } from '@/lib/place/photo';
import { usePlace, usePlaceStore } from '@/store/usePlaceStore';

const RATING_LABELS = [
  '',
  '별로였어요',
  '그저 그랬어요',
  '괜찮았어요',
  '좋았어요',
  '최고였어요!',
];

/** 다녀온 기록 남기기 / 수정 */
export default function VisitFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const place = usePlace(id);
  const recordVisit = usePlaceStore((state) => state.recordVisit);
  const saved = place?.visit;

  const [date, setDate] = useState(saved?.date ?? todayKey());
  const [rating, setRating] = useState(saved?.rating ?? 5);
  const [review, setReview] = useState(saved?.review ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(
    saved?.photoUri ?? null
  );

  if (!place) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <NavBar />
        <EmptyState
          emoji="🫥"
          title="장소를 찾을 수 없어요"
          description="이미 지운 장소일 수 있어요."
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
      discardNewPhoto(photoUri);
      setPhotoUri(uri);
    } catch {
      Alert.alert('사진을 불러오지 못했어요', '잠시 후 다시 시도해주세요.');
    }
  };

  const removePhoto = () => {
    discardNewPhoto(photoUri);
    setPhotoUri(null);
  };

  const cancel = () => {
    discardNewPhoto(photoUri);
    router.back();
  };

  const save = () => {
    recordVisit(place.id, { date, rating, review: review.trim(), photoUri });
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <NavBar title={saved ? '기록 수정' : '다녀온 기록'} onBack={cancel} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerClassName="gap-7 px-5 pb-8 pt-2"
          keyboardShouldPersistTaps="handled"
        >
          <Text weight="700" size={22}>
            {place.title}, 어땠어요?
          </Text>

          <View>
            <FieldLabel>언제 다녀왔어요?</FieldLabel>
            <View className="h-12 flex-row items-center justify-between rounded-xl border-[1.5px] px-2 border-border">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="하루 전"
                hitSlop={6}
                onPress={() => moveDate(-1)}
                className="h-10 w-10 items-center justify-center"
              >
                <Icon as={ChevronLeft} size={20} />
              </Pressable>
              <Text weight="600" size={16}>
                {dayjs(date).format('YYYY년 M월 D일 (dd)')}
                {isToday ? ' · 오늘' : ''}
              </Text>
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
            />
          </View>

          <View>
            <FieldLabel>사진 (선택)</FieldLabel>
            {photoUri ? (
              <View className="overflow-hidden rounded-2xl">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="사진 바꾸기"
                  onPress={choosePhoto}
                >
                  <Image
                    source={{ uri: photoUri }}
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

        <View className="px-5 pb-4 pt-2">
          <Button label="기록 저장하기" onPress={save} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
