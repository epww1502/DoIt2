import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Text } from '@/components/atoms';
import { ItemIcon } from '@/components/bucket/ItemIcon';
import { settingTag, type BucketItem } from '@/lib/bucket/types';
import { cn } from '@/lib/utils';

/** 카드 한 장 너비와 간격 */
const CARD_WIDTH = 132;
const CARD_GAP = 12;
const STEP = CARD_WIDTH + CARD_GAP;
/** 촤르륵 지나가는 시간 */
const REEL_DURATION_MS = 2000;
/** 처음엔 빠르게, 끝에서 천천히 멈춘다 */
const REEL_EASING = Easing.out(Easing.cubic);
/** 시작할 때 화면 왼쪽도 카드로 차 있게, 몇 번째 카드를 가운데에 두고 시작할지 */
const START_INDEX = 2;
/** 멈춘 뒤 뽑힌 카드를 보여주는 시간 (그다음 결과 화면으로) */
const LANDED_HOLD_MS = 600;

type PickReelProps = {
  /** 지나갈 카드들. 뽑힌 카드 뒤에도 카드가 더 있어서 줄 중간에서 멈춘다 */
  reel: BucketItem[];
  /** reel 안에서 뽑힌 카드의 위치 */
  pickedIndex: number;
  onEnd: () => void;
};

/**
 * 뽑기 애니메이션: 카드들이 오른쪽에서 왼쪽으로 빠르게 지나가다가
 * 뽑힌 카드가 가운데에 오면서 멈춘다. 멈추기 전에는 어느 카드인지 표시하지 않고,
 * 멈춘 뒤에 그 카드만 '톡' 튀며 테두리가 생기고 나머지는 흐려진다.
 */
export function PickReel({ reel, pickedIndex, onEnd }: PickReelProps) {
  const [width, setWidth] = useState(0);
  const [landed, setLanded] = useState(false);
  const translateX = useSharedValue(0);
  const pickedScale = useSharedValue(1);

  useEffect(() => {
    if (width === 0 || reel.length === 0) return;
    const center = width / 2 - CARD_WIDTH / 2;
    translateX.set(center - START_INDEX * STEP);
    translateX.set(
      withTiming(
        center - pickedIndex * STEP,
        { duration: REEL_DURATION_MS, easing: REEL_EASING },
        (finished) => {
          if (finished) scheduleOnRN(setLanded, true);
        }
      )
    );
  }, [width, reel, pickedIndex, translateX]);

  // 멈추면 뽑힌 카드가 톡 튀고, 잠깐 보여준 뒤 결과로 넘어간다
  useEffect(() => {
    if (!landed) return;
    pickedScale.set(
      withSequence(
        withTiming(1.1, { duration: 120 }),
        withSpring(1, { damping: 6, stiffness: 260 })
      )
    );
    const timer = setTimeout(onEnd, LANDED_HOLD_MS);
    return () => clearTimeout(timer);
  }, [landed, pickedScale, onEnd]);

  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.get() }],
  }));
  const pickedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pickedScale.get() }],
  }));

  return (
    <View
      className="h-[210px] justify-center overflow-hidden"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {/* 가운데 표시: 여기에 멈춘 카드가 뽑힌 것 */}
      <View
        pointerEvents="none"
        className="absolute bottom-0 top-0 self-center rounded-3xl border-2 border-dashed border-primary"
        style={{ width: CARD_WIDTH + 12 }}
      />
      <Animated.View
        className="flex-row"
        style={[{ gap: CARD_GAP }, stripStyle]}
      >
        {reel.map((item, i) => {
          const isPicked = landed && i === pickedIndex;
          return (
            <Animated.View
              // 같은 항목이 여러 번 나오므로 순서를 키로 쓴다
              key={i}
              style={[
                { width: CARD_WIDTH },
                i === pickedIndex ? pickedStyle : null,
              ]}
            >
              <View
                className={cn(
                  'h-[176px] items-center justify-center gap-2 rounded-2xl bg-card p-3',
                  isPicked ? 'border-2 border-primary' : 'border border-border',
                  landed && !isPicked && 'opacity-40'
                )}
              >
                <ItemIcon item={item} size={56} emojiSize={40} bare />
                <Text
                  weight="700"
                  size={15}
                  numberOfLines={2}
                  className="text-center"
                >
                  {item.title}
                </Text>
                <Text size={11} className="text-muted-foreground">
                  {settingTag(item.setting)}
                </Text>
              </View>
            </Animated.View>
          );
        })}
      </Animated.View>
    </View>
  );
}
