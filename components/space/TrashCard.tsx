import { router, useFocusEffect } from 'expo-router';
import { ChevronRight, Trash2 } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Icon, Text } from '@/components/atoms';
import { countTrash, TRASH_HOURS } from '@/lib/trash';
import { useBucketStore } from '@/store/useBucketStore';

/** 설정: 휴지통으로 가는 칸. 지운 게 있으면 몇 개인지 */
export function TrashCard() {
  const spaceId = useBucketStore((s) => s.spaceId);
  const [count, setCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!spaceId) return;
      let alive = true;
      void countTrash(spaceId).then((n) => {
        if (alive) setCount(n);
      });
      return () => {
        alive = false;
      };
    }, [spaceId])
  );

  if (!spaceId) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `휴지통, ${count}개` : '휴지통'}
      onPress={() => router.push('/trash')}
      className="flex-row items-center gap-3 rounded-2xl px-4 py-3 bg-accent active:opacity-70"
    >
      <View
        className="items-center justify-center overflow-hidden rounded-full bg-accent"
        style={{ width: 36, height: 36 }}
      >
        <Icon as={Trash2} size={18} className="text-muted-foreground" />
      </View>
      <View className="flex-1 gap-0.5">
        <Text weight="600" size={14}>
          휴지통
        </Text>
        <Text size={12} className="text-muted-foreground" numberOfLines={1}>
          {count > 0
            ? `지운 버킷리스트 ${count}개 · 되살릴 수 있어요`
            : `지운 버킷리스트를 ${TRASH_HOURS}시간 동안 되살릴 수 있어요`}
        </Text>
      </View>
      <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
    </Pressable>
  );
}
