import dayjs from 'dayjs';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { MapPin, Pencil, Trash2 } from 'lucide-react-native';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge, Button, Icon, NavBar, Text } from '@/components/atoms';
import { EmptyState } from '@/components/bucket/EmptyState';
import { StarRating } from '@/components/bucket/StarRating';
import { getCategory, KIND_META } from '@/lib/bucket/types';
import { useBucketItem, useBucketStore } from '@/store/useBucketStore';

export default function BucketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useBucketItem(id);
  const removeItem = useBucketStore((state) => state.removeItem);
  const clearDone = useBucketStore((state) => state.clearDone);

  if (!item) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <NavBar />
        <EmptyState
          emoji="🫥"
          title="찾을 수 없어요"
          description="이미 지운 항목일 수 있어요."
        />
      </SafeAreaView>
    );
  }

  const category = getCategory(item.category);
  const meta = KIND_META[item.kind];
  const done = item.done;

  const confirmRemove = () => {
    Alert.alert(
      '버킷리스트에서 지울까요?',
      '함께한 기록과 사진도 같이 지워져요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '지우기',
          style: 'destructive',
          onPress: () => {
            router.back();
            removeItem(item.id);
          },
        },
      ]
    );
  };

  const confirmClearDone = () => {
    Alert.alert('기록을 지울까요?', '다시 버킷리스트로 돌아가요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '지우기',
        style: 'destructive',
        onPress: () => clearDone(item.id),
      },
    ]);
  };

  const goRecord = () =>
    router.push({ pathname: '/record/[id]', params: { id: item.id } });

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

      <ScrollView contentContainerClassName="gap-6 px-5 pb-10">
        <View className="items-center gap-3 pt-4">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-accent">
            <Text size={40}>{category.emoji}</Text>
          </View>
          <Badge variant="primary">
            <Text>
              {meta.emoji} {meta.label} · {category.label}
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
              우리의 기록 💕
            </Text>
            <View className="overflow-hidden rounded-2xl border bg-card border-border">
              {done.photoUri ? (
                <Image
                  source={{ uri: done.photoUri }}
                  style={{ width: '100%', aspectRatio: 4 / 3 }}
                  contentFit="cover"
                />
              ) : null}
              <View className="gap-2 p-4">
                <View className="flex-row items-center justify-between">
                  <Text weight="600">
                    {dayjs(done.date).format('YYYY년 M월 D일 (dd)')}
                  </Text>
                  <StarRating value={done.rating} />
                </View>
                {done.review ? (
                  <Text variant="body">“{done.review}”</Text>
                ) : null}
              </View>
            </View>
            <View className="flex-row gap-2">
              <Button
                label="기록 수정"
                variant="outline"
                size="md"
                className="flex-1"
                onPress={goRecord}
              />
              <Button
                label="기록 지우기"
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
        <View className="px-5 pb-4 pt-2">
          <Button label={`${meta.doneLabel} 기록 남기기`} onPress={goRecord} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}
