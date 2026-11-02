import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon, Text } from '@/components/atoms';
import { CategoryIcon } from '@/components/bucket/CategoryIcon';
import { dayCount, itemTodos, type BucketItem } from '@/lib/bucket/types';
import { todayKey } from '@/lib/date';
import { cn } from '@/lib/utils';

import { goalDday } from './goalDday';

/** 버킷리스트 맨 위: 시작하기를 눌러 진행 중인 항목들 (먼저 시작한 것부터) */
export function InProgressSection({
  items,
  className,
}: {
  items: BucketItem[];
  className?: string;
}) {
  if (items.length === 0) return null;
  const today = todayKey();
  const sorted = [...items].sort((a, b) =>
    (a.started?.date ?? '').localeCompare(b.started?.date ?? '')
  );

  return (
    <View className={cn('gap-2 rounded-2xl p-4 bg-accent', className)}>
      <Text weight="700" size={15}>
        진행 중 · {items.length}
      </Text>
      {sorted.map((item) => {
        const days = Math.max(dayCount(item.started!.date, today), 1);
        const todos = itemTodos(item);
        const extra = [
          item.goal ? goalDday(item.goal.date) : null,
          todos.length > 0
            ? `${todos.filter((t) => t.done).length}/${todos.length}`
            : null,
        ].filter(Boolean);
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            onPress={() =>
              router.push({ pathname: '/item/[id]', params: { id: item.id } })
            }
            className="flex-row items-center gap-2 rounded-xl bg-background px-3 py-2.5 active:opacity-80"
          >
            <CategoryIcon category={item.category} size={18} />
            <Text weight="600" size={15} numberOfLines={1} className="flex-1">
              {item.title}
            </Text>
            <Text weight="600" size={12} className="text-primary">
              {days}일째
              {extra.length > 0 ? ` · ${extra.join(' · ')}` : ''}
            </Text>
            <Icon
              as={ChevronRight}
              size={16}
              className="text-muted-foreground"
            />
          </Pressable>
        );
      })}
    </View>
  );
}
