import { Check } from 'lucide-react-native';
import { useEffect, useRef, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';

import { Icon } from '@/components/atoms';
import { cn } from '@/lib/utils';

/** 고르기 모드가 켜질 때 목록이 위에서부터 차례로 통통 튀게 하는 간격 */
const STAGGER_MS = 35;
/** 너무 아래 항목까지 기다리지 않게 */
const MAX_STAGGER_STEPS = 8;
const BOUNCE_SPRING = { damping: 6, stiffness: 280, mass: 0.6 };
const LONG_PRESS_MS = 350;

type SelectableProps = {
  /** 고르기 모드인지 */
  selecting: boolean;
  selected: boolean;
  /** 목록에서의 순서 (튀는 시작 시점을 조금씩 늦춘다) */
  index: number;
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
 * 고르기 모드가 켜지면 통통 튀고, 오른쪽 위에 체크 동그라미가 나온다.
 */
export function Selectable({
  selecting,
  selected,
  index,
  onPress,
  onLongPress,
  onToggle,
  className,
  children,
}: SelectableProps) {
  const scale = useSharedValue(1);
  const wasSelecting = useRef(selecting);

  // 고르기 모드가 켜지는 순간 통통
  useEffect(() => {
    if (selecting && !wasSelecting.current) {
      const delay = Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS;
      scale.set(
        withDelay(
          delay,
          withSequence(
            withTiming(0.92, { duration: 110 }),
            withSpring(1, BOUNCE_SPRING)
          )
        )
      );
    }
    wasSelecting.current = selecting;
  }, [selecting, index, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  // 고르거나 뺄 때도 살짝 통
  const pop = () =>
    scale.set(
      withSequence(
        withTiming(0.95, { duration: 70 }),
        withSpring(1, BOUNCE_SPRING)
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
          <Animated.View
            entering={ZoomIn.springify().damping(9)}
            exiting={ZoomOut.duration(120)}
            pointerEvents="none"
            className="absolute right-3 top-3"
          >
            <View
              className={cn(
                'h-7 w-7 items-center justify-center rounded-full border-2',
                selected
                  ? 'bg-primary border-primary'
                  : 'bg-background border-muted'
              )}
            >
              {selected ? (
                <Icon
                  as={Check}
                  size={16}
                  className="text-primary-foreground"
                />
              ) : null}
            </View>
          </Animated.View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}
