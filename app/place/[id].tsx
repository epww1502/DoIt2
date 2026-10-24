import dayjs from 'dayjs';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { MapPin, Pencil, Trash2 } from 'lucide-react-native';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge, Button, Icon, NavBar, Text } from '@/components/atoms';
import { EmptyState } from '@/components/place/EmptyState';
import { StarRating } from '@/components/place/StarRating';
import { getCategory } from '@/lib/place/types';
import { usePlace, usePlaceStore } from '@/store/usePlaceStore';

export default function PlaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const place = usePlace(id);
  const removePlace = usePlaceStore((state) => state.removePlace);
  const clearVisit = usePlaceStore((state) => state.clearVisit);

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

  const category = getCategory(place.category);
  const visit = place.visit;

  const confirmRemove = () => {
    Alert.alert('이 장소를 지울까요?', '다녀온 기록과 사진도 함께 지워져요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '지우기',
        style: 'destructive',
        onPress: () => {
          router.back();
          removePlace(place.id);
        },
      },
    ]);
  };

  const confirmClearVisit = () => {
    Alert.alert(
      '다녀온 기록을 지울까요?',
      "장소는 다시 '갈 곳'으로 돌아가요.",
      [
        { text: '취소', style: 'cancel' },
        {
          text: '지우기',
          style: 'destructive',
          onPress: () => clearVisit(place.id),
        },
      ]
    );
  };

  const goVisit = () =>
    router.push({ pathname: '/visit/[id]', params: { id: place.id } });

  return (
    <SafeAreaView className="flex-1 bg-background">
      <NavBar
        right={
          <View className="flex-row">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="수정"
              hitSlop={6}
              onPress={() =>
                router.push({
                  pathname: '/place/new',
                  params: { id: place.id },
                })
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

      <ScrollView contentContainerClassName="gap-6 px-5 pb-10">
        <View className="items-center gap-3 pt-4">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-accent">
            <Text size={40}>{category.emoji}</Text>
          </View>
          <Badge variant="primary">
            <Text>{category.label}</Text>
          </Badge>
          <Text weight="700" size={24} className="text-center">
            {place.title}
          </Text>
          {place.location ? (
            <View className="flex-row items-center gap-1">
              <Icon as={MapPin} size={14} className="text-muted-foreground" />
              <Text variant="muted">{place.location}</Text>
            </View>
          ) : null}
          <Text variant="muted" size={12}>
            {dayjs(place.createdAt).format('YYYY년 M월 D일')}에 담았어요
          </Text>
        </View>

        {place.memo ? (
          <View className="gap-1 rounded-2xl p-4 bg-accent">
            <Text weight="600" size={13} className="text-muted-foreground">
              메모
            </Text>
            <Text variant="body">{place.memo}</Text>
          </View>
        ) : null}

        {visit ? (
          <View className="gap-3">
            <Text weight="700" size={18}>
              우리의 기록 💕
            </Text>
            <View className="overflow-hidden rounded-2xl border bg-card border-border">
              {visit.photoUri ? (
                <Image
                  source={{ uri: visit.photoUri }}
                  style={{ width: '100%', aspectRatio: 4 / 3 }}
                  contentFit="cover"
                />
              ) : null}
              <View className="gap-2 p-4">
                <View className="flex-row items-center justify-between">
                  <Text weight="600">
                    {dayjs(visit.date).format('YYYY년 M월 D일 (dd)')}
                  </Text>
                  <StarRating value={visit.rating} />
                </View>
                {visit.review ? (
                  <Text variant="body">“{visit.review}”</Text>
                ) : null}
              </View>
            </View>
            <View className="flex-row gap-2">
              <Button
                label="기록 수정"
                variant="outline"
                size="md"
                className="flex-1"
                onPress={goVisit}
              />
              <Button
                label="기록 지우기"
                variant="ghost"
                size="md"
                className="flex-1"
                onPress={confirmClearVisit}
              />
            </View>
          </View>
        ) : null}
      </ScrollView>

      {!visit ? (
        <View className="px-5 pb-4 pt-2">
          <Button label="다녀왔어요! 기록 남기기" onPress={goVisit} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}
