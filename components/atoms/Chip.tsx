import { Pressable } from 'react-native';

import { cn } from '@/lib/utils';

import { Text } from './Text';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export function Chip({ label, selected = false, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={cn(
        'h-10 items-center justify-center rounded-full border px-4',
        selected ? 'bg-primary border-primary' : 'bg-background border-muted'
      )}
    >
      <Text
        size={14}
        weight="500"
        className={selected ? 'text-primary-foreground' : 'text-foreground'}
      >
        {label}
      </Text>
    </Pressable>
  );
}
