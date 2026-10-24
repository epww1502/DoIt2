import { Pressable } from 'react-native';

import { cn } from '@/lib/utils';

import { Text } from './Text';

type ChipProps = {
  label: string;
  /** 글자 앞에 붙는 이모지 */
  emoji?: string;
  selected?: boolean;
  onPress?: () => void;
};

export function Chip({ label, emoji, selected = false, onPress }: ChipProps) {
  const textClass = selected ? 'text-primary-foreground' : 'text-foreground';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      className={cn(
        'h-10 flex-row items-center justify-center gap-1 rounded-full border px-4',
        selected ? 'bg-primary border-primary' : 'bg-background border-muted'
      )}
    >
      {/* 이모지와 글자를 한 Text에 넣으면, 안드로이드에서 이모지(✨ 등) 폭을 실제보다 좁게 재서
          글자가 둘째 줄로 밀려 잘린다. 따로 그리고 글자는 한 줄로 고정한다. */}
      {emoji ? <Text size={14}>{emoji}</Text> : null}
      <Text size={14} weight="500" numberOfLines={1} className={textClass}>
        {label}
      </Text>
    </Pressable>
  );
}
