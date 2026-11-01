import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Text } from '@/components/atoms';
import { ItemIcon } from '@/components/bucket/ItemIcon';
import { PlateDiceIcon } from '@/components/bucket/PlateDiceIcon';
import { settingTag, type BucketItem } from '@/lib/bucket/types';
import { usePrimaryColor } from '@/store/useSettingsStore';

/** 카드 크기 */
const CARD_WIDTH = 110;
const CARD_HEIGHT = 156;
/** 펼치는 카드 수. 가운데 카드가 뽑힌 카드 */
const CARD_COUNT = 5;
const MIDDLE = Math.floor(CARD_COUNT / 2);
/** 이웃 카드끼리 벌어지는 각도와, 카드 아래쪽 어디를 축으로 펼칠지 */
const FAN_ANGLE_DEG = 11;
const FAN_RADIUS = 260;
/** 펼치기 전 더미에서도 다섯 장이 보이게 살짝 비뚤게 쌓는 각도 */
const PILE_ANGLE_DEG = 2.5;
/** 단계별 시작 시각(ms): 펼치기 → 가운데 카드 솟기 → 뒤집기 */
const SPREAD_AT = 350;
const SPREAD_MS = 450;
const LIFT_AT = 800;
const LIFT_MS = 380;
const FLIP_AT = 1250;
const FLIP_MS = 460;
/** 뒤집힌 뒤 결과 화면으로 넘어가기 전에 보여주는 시간 */
const LANDED_HOLD_MS = 700;

type PickFanProps = {
  /** 뽑힌 항목 (가운데 카드 앞면) */
  picked: BucketItem;
  onEnd: () => void;
};

/**
 * 뽑기 애니메이션: 엎어둔 카드 더미가 부채꼴로 펼쳐지고,
 * 가운데 카드가 쏙 솟아올라 뒤집히면서 뽑힌 항목이 보인다.
 */
export function PickFan({ picked, onEnd }: PickFanProps) {
  const [landed, setLanded] = useState(false);
  const spread = useSharedValue(0);
  const lift = useSharedValue(0);
  const flip = useSharedValue(0);
  const bump = useSharedValue(1);

  useEffect(() => {
    spread.set(
      withDelay(
        SPREAD_AT,
        withTiming(1, {
          duration: SPREAD_MS,
          easing: Easing.out(Easing.cubic),
        })
      )
    );
    lift.set(
      withDelay(
        LIFT_AT,
        withTiming(1, {
          duration: LIFT_MS,
          easing: Easing.out(Easing.back(1.6)),
        })
      )
    );
    flip.set(
      withDelay(
        FLIP_AT,
        withTiming(
          1,
          { duration: FLIP_MS, easing: Easing.inOut(Easing.cubic) },
          (finished) => {
            if (finished) scheduleOnRN(setLanded, true);
          }
        )
      )
    );
  }, [spread, lift, flip]);

  // 뒤집히면 카드가 톡 튀고, 잠깐 보여준 뒤 결과로 넘어간다
  useEffect(() => {
    if (!landed) return;
    bump.set(
      withSequence(
        withTiming(1.08, { duration: 110 }),
        withSpring(1, { damping: 6, stiffness: 260 })
      )
    );
    const timer = setTimeout(onEnd, LANDED_HOLD_MS);
    return () => clearTimeout(timer);
  }, [landed, bump, onEnd]);

  // 가운데 카드를 맨 위에 그리려고 마지막에 둔다
  // 바깥 카드부터 그려서 안쪽 카드가 위에 오게 (양쪽이 똑같이 보이게).
  // 가운데 카드는 맨 위
  const order = Array.from({ length: CARD_COUNT }, (_, i) => i).sort(
    (a, b) => Math.abs(b - MIDDLE) - Math.abs(a - MIDDLE)
  );

  return (
    <View
      className="items-center justify-center"
      style={{ height: CARD_HEIGHT + 70 }}
    >
      {order.map((i) =>
        i === MIDDLE ? (
          <PickedCard
            key={i}
            item={picked}
            lift={lift}
            flip={flip}
            bump={bump}
          />
        ) : (
          <SideCard key={i} index={i} spread={spread} lift={lift} />
        )
      )}
    </View>
  );
}

/** 부채꼴에서 index번째 카드의 위치·각도 */
function fanTransform(index: number, spread: number) {
  'worklet';
  const angle =
    (index - MIDDLE) *
    (PILE_ANGLE_DEG + (FAN_ANGLE_DEG - PILE_ANGLE_DEG) * spread);
  const rad = (angle * Math.PI) / 180;
  return {
    x: FAN_RADIUS * Math.sin(rad),
    y: FAN_RADIUS * (1 - Math.cos(rad)) + 14,
    angle,
  };
}

/** 옆 카드: 펼쳐졌다가 가운데 카드가 솟으면 살짝 내려앉는다 */
function SideCard({
  index,
  spread,
  lift,
}: {
  index: number;
  spread: SharedValue<number>;
  lift: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const { x, y, angle } = fanTransform(index, spread.get());
    return {
      transform: [
        { translateX: x },
        { translateY: y + lift.get() * 14 },
        { rotate: `${angle}deg` },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute' }, style]}>
      <CardBack />
    </Animated.View>
  );
}

/** 가운데(뽑힌) 카드: 위로 솟고 커지면서 뒤집힌다 */
function PickedCard({
  item,
  lift,
  flip,
  bump,
}: {
  item: BucketItem;
  lift: SharedValue<number>;
  flip: SharedValue<number>;
  bump: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const l = lift.get();
    // 0→0.5: 뒷면이 옆으로 돌아가고, 0.5→1: 앞면이 돌아 나온다
    const f = flip.get();
    const angle = f < 0.5 ? f * 180 : (f - 1) * 180;
    return {
      transform: [
        { perspective: 800 },
        { translateY: 14 - l * 34 },
        { scale: (1 + l * 0.14) * bump.get() },
        { rotateY: `${angle}deg` },
      ],
    };
  });
  const backStyle = useAnimatedStyle(() => ({
    opacity: flip.get() < 0.5 ? 1 : 0,
  }));
  const frontStyle = useAnimatedStyle(() => ({
    opacity: flip.get() < 0.5 ? 0 : 1,
  }));
  return (
    <Animated.View style={[{ position: 'absolute' }, style]}>
      <Animated.View style={backStyle}>
        <CardBack />
      </Animated.View>
      <Animated.View
        style={[{ position: 'absolute', top: 0, left: 0 }, frontStyle]}
      >
        <View
          className="items-center justify-center gap-2 rounded-2xl border-2 border-primary bg-card p-3"
          style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
        >
          <ItemIcon item={item} size={52} iconSize={26} bare />
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
    </Animated.View>
  );
}

/** 카드 뒷면: 테마색 바탕에 '오늘 뭐 하지' 그림 */
function CardBack() {
  const primary = usePrimaryColor();
  return (
    <View
      className="items-center justify-center rounded-2xl border-[3px] border-card bg-primary"
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
    >
      <View
        className="items-center justify-center rounded-xl border border-dashed border-white/60"
        style={{ width: CARD_WIDTH - 18, height: CARD_HEIGHT - 18 }}
      >
        <PlateDiceIcon size={40} color="#FFFFFF" cutout={primary} />
      </View>
    </View>
  );
}
