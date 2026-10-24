import { Check } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '@/components/atoms';
import { cn } from '@/lib/utils';

const PRESS_SPRING = { damping: 6, stiffness: 280, mass: 0.6 };
const LONG_PRESS_MS = 350;

type SelectableProps = {
  /** 고르기 모드인지 */
  selecting: boolean;
  selected: boolean;
  /** 고르기 모드가 아닐 때 누르면 */
  onPress: () => void;
  /** 고르기 모드를 켠다 */
  onLongPress: () => void;
  /** 고르기 모드에서 누르면 */
  onToggle: () => void;
  className?: string;
  children: ReactNode;
};

/**
 * 길게 누르면 고르기 모드가 되는 목록 항목.
 * 누른 카드만 살짝 눌렸다 돌아오고, 고르기 모드에서는 오른쪽 위에 체크 동그라미가 나온다.
 */
export function Selectable({
  selecting,
  selected,
  onPress,
  onLongPress,
  onToggle,
  className,
  children,
}: SelectableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  // 길게 누르거나 고르기/뺄 때 누른 카드만 살짝 '통'
  const pop = () =>
    scale.set(
      withSequence(
        withTiming(0.95, { duration: 70 }),
        withSpring(1, PRESS_SPRING)
      )
    );

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole={selecting ? 'checkbox' : 'button'}
        accessibilityState={selecting ? { checked: selected } : undefined}
        delayLongPress={LONG_PRESS_MS}
        onPress={() => {
          if (!selecting) return onPress();
          pop();
          onToggle();
        }}
        onLongPress={() => {
          if (selecting) return;
          pop();
          onLongPress();
        }}
        className={cn(className, selected && 'border-2 border-primary')}
      >
        {children}
        {selecting ? (
          <View
            pointerEvents="none"
            className={cn(
              'absolute right-3 top-3 h-7 w-7 items-center justify-center rounded-full border-2',
              selected
                ? 'border-primary bg-primary'
                : 'bg-background border-muted'
            )}
          >
            {selected ? (
              <Icon as={Check} size={16} className="text-primary-foreground" />
            ) : null}
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}
