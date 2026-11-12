import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  TextInput,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';

/** 입력칸 아래와 보이는 영역 끝 사이에 남길 여백 */
const FOCUS_MARGIN = 24;
/** 키보드 여백이 화면에 반영된 뒤에 위치를 재도록 기다리는 시간 */
const LAYOUT_DELAY_MS = 100;

/**
 * 지금 올라와 있는 키보드 높이(px). 내려가 있으면 0.
 * 안드로이드는 edge-to-edge라 키보드가 올라와도 화면이 줄지 않고,
 * KeyboardAvoidingView도 높이를 제대로 못 잡는 경우가 있어서 키보드 이벤트 높이를 직접 쓴다.
 */
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    // iOS는 올라오기 직전(will) 이벤트가 있어 더 자연스럽다. 안드로이드는 did만 있다.
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvent, (e) =>
      setHeight(e.endCoordinates.height)
    );
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}

/**
 * 입력 폼용: 키보드 높이만큼 아래 여백을 주고, 포커스된 입력칸이 가려지면 그만큼 스크롤한다.
 * - 화면 컨테이너 style에 { paddingBottom: keyboardHeight }
 * - ScrollView에 ref={scrollRef}, onScroll={onScroll}, scrollEventThrottle={16}
 * - 각 입력칸 onFocus={ensureFocusedVisible}
 */
export function useKeyboardAwareForm() {
  const keyboardHeight = useKeyboardHeight();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const offsetY = useRef(0);
  // 위치를 잴 때(조금 뒤) 읽는 키보드 높이
  const keyboardRef = useRef(0);
  useEffect(() => {
    keyboardRef.current = keyboardHeight;
  }, [keyboardHeight]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetY.current = e.nativeEvent.contentOffset.y;
  }, []);

  const ensureFocusedVisible = useCallback(() => {
    setTimeout(() => {
      const input = TextInput.State.currentlyFocusedInput();
      const scroll = scrollRef.current;
      if (!input || !scroll) return;
      scroll.measureInWindow((_sx, sy, _sw, sh) => {
        input.measureInWindow((_ix, iy, _iw, ih) => {
          // 키보드가 스크롤 영역을 덮는 화면도 있어서, 스크롤 영역 끝과 키보드 윗선 중 더 위를 기준으로
          const visibleBottom = Math.min(
            sy + sh,
            Dimensions.get('window').height - keyboardRef.current
          );
          const overflow = iy + ih + FOCUS_MARGIN - visibleBottom;
          if (overflow > 0) {
            scroll.scrollTo({ y: offsetY.current + overflow, animated: true });
          }
        });
      });
    }, LAYOUT_DELAY_MS);
  }, []);

  // 키보드가 올라오면 지금 입력 중인 칸이 보이게 한다
  useEffect(() => {
    if (keyboardHeight > 0) ensureFocusedVisible();
  }, [keyboardHeight, ensureFocusedVisible]);

  return { keyboardHeight, scrollRef, onScroll, ensureFocusedVisible };
}
