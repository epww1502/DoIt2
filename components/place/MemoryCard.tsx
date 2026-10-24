import dayjs from 'dayjs';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/atoms';
import { getCategory, type Place } from '@/lib/place/types';

import { StarRating } from './StarRating';

/** '다녀온 곳' 목록의 카드. visit이 있는 장소만 넘긴다. */
export function MemoryCard({ place }: { place: Place }) {
  const visit = place.visit;
  if (!visit) return null;
  const category = getCategory(place.category);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        router.push({ pathname: '/place/[id]', params: { id: place.id } })
      }
      className="overflow-hidden rounded-2xl border bg-card border-border active:opacity-80"
    >
      {visit.photoUri ? (
        <Image
          source={{ uri: visit.photoUri }}
          style={{ width: '100%', aspectRatio: 4 / 3 }}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View className="h-24 items-center justify-center bg-accent">
          <Text size={36}>{category.emoji}</Text>
        </View>
      )}
      <View className="gap-1.5 p-4">
        <View className="flex-row items-center justify-between gap-2">
          <Text weight="700" size={17} numberOfLines={1} className="flex-1">
            {place.title}
          </Text>
          <StarRating value={visit.rating} size={14} />
        </View>
        <Text variant="muted" size={13}>
          {dayjs(visit.date).format('YYYY년 M월 D일 (dd)')}
          {place.location ? ` · ${place.location}` : ''}
        </Text>
        {visit.review ? (
          <Text variant="body" className="mt-1">
            “{visit.review}”
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
