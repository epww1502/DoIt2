import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon, Text } from '@/components/atoms';
import { getCategory, type Place } from '@/lib/place/types';

/** '갈 곳' 목록의 한 줄 */
export function PlaceRow({ place }: { place: Place }) {
  const category = getCategory(place.category);
  const meta = [category.label, place.location].filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        router.push({ pathname: '/place/[id]', params: { id: place.id } })
      }
      className="flex-row items-center gap-3 rounded-2xl border p-4 bg-card border-border active:opacity-70"
    >
      <View className="h-12 w-12 items-center justify-center rounded-full bg-accent">
        <Text size={22}>{category.emoji}</Text>
      </View>
      <View className="flex-1 gap-0.5">
        <Text weight="600" size={16} numberOfLines={1}>
          {place.title}
        </Text>
        <Text variant="muted" size={13} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <Icon as={ChevronRight} size={20} className="text-muted-foreground" />
    </Pressable>
  );
}
