import { Check } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon, Text } from '@/components/atoms';
import type { ItemTodo } from '@/lib/bucket/types';
import { cn } from '@/lib/utils';

type TodoPillsProps = {
  todos: ItemTodo[];
  /** 이만큼만 보이고 나머지는 '+N' */
  max?: number;
  className?: string;
};

/**
 * 할 것을 작은 알약으로 한 줄씩 늘어놓는다 (일지 카드·추천 카드).
 * 체크한 것은 체크 표시, 아직 안 한 것은 빈 동그라미.
 */
export function TodoPills({ todos, max = 4, className }: TodoPillsProps) {
  if (todos.length === 0) return null;
  const more = todos.length - max;
  return (
    <View className={cn('flex-row flex-wrap gap-1.5', className)}>
      {todos.slice(0, max).map((t) => (
        <View
          key={t.id}
          className="max-w-full flex-row items-center gap-1 rounded-full px-2.5 py-1 bg-accent"
        >
          {t.done ? (
            <Icon
              as={Check}
              size={12}
              strokeWidth={3}
              className="text-primary"
            />
          ) : (
            <View className="h-2.5 w-2.5 rounded-full border-[1.5px] border-primary/60" />
          )}
          <Text size={12} numberOfLines={1} className="shrink text-foreground">
            {t.text}
          </Text>
        </View>
      ))}
      {more > 0 ? (
        <View className="rounded-full px-2.5 py-1 bg-accent">
          <Text size={12} className="text-muted-foreground">
            +{more}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
