import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/** 이만큼(px) 넘게 끌거나 빠르게 튕기면 닫는다 */
const CLOSE_DISTANCE = 90;
const CLOSE_VELOCITY = 900;
/** handleOnly일 때 끌 수 있는 위쪽 높이 (손잡이·제목 부분) */
const HANDLE_HEIGHT = 56;
const NO_STYLE = {};

type SheetPanelProps = {
  onClose: () => void;
  /** 시트 안에 스크롤 목록이 있으면 true: 위쪽 손잡이 부분만 끌린다 (목록 스크롤과 겹치지 않게) */
  handleOnly?: boolean;
  /** 최대 높이 등 (예: { maxHeight: '85%' }) */
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/**
 * 아래에서 올라오는 시트 판. 아래로 끌어 내리면 닫힌다.
 * Modal 안에서 쓴다 (배경은 Modal fade, 판만 아래에서 올라온다)
 */
export function SheetPanel({
  onClose,
  handleOnly,
  style,
  children,
}: SheetPanelProps) {
  const y = useSharedValue(0);

  const pan = Gesture.Pan()
    // 아래로 조금 끌어야 시작한다 (누르기·옆으로 넘기기는 그대로)
    .activeOffsetY(8)
    .failOffsetX([-16, 16])
    .onUpdate((e) => {
      y.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > CLOSE_DISTANCE || e.velocityY > CLOSE_VELOCITY) {
        y.value = withTiming(800, { duration: 180 });
        runOnJS(onClose)();
      } else {
        y.value = withSpring(0, { damping: 20, stiffness: 220 });
      }
    });
  if (handleOnly) pan.hitSlop({ top: 0, height: HANDLE_HEIGHT });

  const dragged = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));

  return (
    // Modal 안은 앱의 제스처 영역 밖이라 따로 감싼다
    // style이 없으면 flex: 1로 화면을 다 차지해 시트가 위로 붙는다. 그래서 늘 넘긴다
    <GestureHandlerRootView style={style ?? NO_STYLE}>
      <GestureDetector gesture={pan}>
        <Animated.View
          entering={SlideInDown.duration(260)}
          style={[{ flexShrink: 1 }, dragged]}
        >
          {children}
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}
