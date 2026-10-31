import type { LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { cn } from '@/lib/utils';

import { Icon } from './Icon';
import { Text } from './Text';

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  /** 글자 앞 선 아이콘 (선택되면 테마색) */
  icon?: LucideIcon;
};

type SegmentedProps<T extends string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: SegmentedProps<T>) {
  return (
    <View className="h-10 flex-row rounded-full p-[3px] bg-accent">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className={cn(
              'flex-1 flex-row items-center justify-center gap-1 rounded-full',
              selected && 'border border-border bg-card'
            )}
          >
            {option.icon ? (
              <Icon
                as={option.icon}
                size={15}
                className={selected ? 'text-primary' : 'text-muted-foreground'}
              />
            ) : null}
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
