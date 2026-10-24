import { Pressable, View } from 'react-native';

import { cn } from '@/lib/utils';

import { Text } from './Text';

type SegmentedProps<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: SegmentedProps<T>) {
  return (
    <View className="h-10 flex-row rounded-lg p-[3px] bg-accent">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className={cn(
              'flex-1 items-center justify-center rounded-md',
              selected && 'border bg-background border-border'
            )}
          >
            <Text
              size={14}
              weight={selected ? '600' : '400'}
              className={selected ? 'text-foreground' : 'text-muted-foreground'}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
