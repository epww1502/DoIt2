import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { Text } from '@/components/atoms';
import { ItemIcon } from '@/components/bucket/ItemIcon';
import { settingTag, type BucketItem } from '@/lib/bucket/types';

/** 바뀌는 횟수와 처음·마지막 간격(ms): 빠르게 돌다가 점점 느려진다 */
const STEPS = 16;
const FIRST_MS = 50;
const LAST_MS = 320;
/** 멈춘 뒤 결과 화면으로 넘어가기 전에 보여주는 시간 */
const LANDED_HOLD_MS = 650;

/** 슬롯이 한 칸씩 넘어가는 간격들 (점점 느려진다). 합이 대략 전체 시간 */
export function slotDelays(steps = STEPS, first = FIRST_MS, last = LAST_MS) {
  return Array.from({ length: steps }, (_, i) => {
    const t = steps === 1 ? 1 : i / (steps - 1);
    // 끝으로 갈수록 확 느려지게 (제곱)
    return Math.round(first + (last - first) * t * t);
  });
}

type PickSlotProps = {
  /** 돌아가며 보여줄 후보들 */
  candidates: BucketItem[];
  /** 마지막에 멈출 항목 */
  picked: BucketItem;
  onEnd: () => void;
};

/**
 * 뽑기 애니메이션: 슬롯머신처럼 후보들이 빠르게 바뀌다가 점점 느려지며 뽑힌 항목에서 멈춘다.
 */
export function PickSlot({ candidates, picked, onEnd }: PickSlotProps) {
  const [shown, setShown] = useState(candidates[0] ?? picked);
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    const delays = slotDelays();
    const timers: ReturnType<typeof setTimeout>[] = [];
    let at = 0;
    delays.forEach((delay, i) => {
      at += delay;
      const last = i === delays.length - 1;
      timers.push(
        setTimeout(() => {
          if (last) {
            setShown(picked);
            setLanded(true);
          } else {
            // 후보가 하나뿐이어도 돌아가는 느낌은 나게 그대로 둔다
            setShown(candidates[(i + 1) % candidates.length] ?? picked);
          }
        }, at)
      );
    });
    timers.push(setTimeout(onEnd, at + LANDED_HOLD_MS));
    return () => timers.forEach(clearTimeout);
    // 한 번 뽑을 때 한 번만 돈다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked]);

  return (
    <View className="items-center justify-center px-5">
      <View
        className={
          landed
            ? 'w-full items-center gap-2 rounded-3xl border-2 border-primary bg-card p-6'
            : 'w-full items-center gap-2 rounded-3xl border-2 border-dashed border-border bg-card p-6'
        }
      >
        {/* 바뀔 때마다 새로 그려서 살짝 나타나게, 멈추면 톡 커지게 */}
        <Animated.View
          key={`${shown.id}-${landed}`}
          entering={landed ? ZoomIn.springify() : FadeIn.duration(60)}
          className="items-center gap-2"
        >
          <ItemIcon item={shown} size={72} iconSize={34} bare />
          <Text
            weight="700"
            size={22}
            numberOfLines={2}
            className="text-center"
          >
            {shown.title}
          </Text>
          <Text variant="muted" size={13}>
            {settingTag(shown.setting)}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}
