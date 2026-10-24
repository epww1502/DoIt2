import { useSyncExternalStore, type ReactNode } from 'react';
import { Keyboard, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** 버튼과 휴대폰 아래 바(홈 인디케이터·내비게이션 바) 또는 키보드 사이에 둘 여백 */
const EXTRA_BOTTOM_GAP = 12;

function subscribeKeyboard(onChange: () => void) {
  const show = Keyboard.addListener('keyboardDidShow', onChange);
  const hide = Keyboard.addListener('keyboardDidHide', onChange);
  return () => {
    show.remove();
    hide.remove();
  };
}

function useKeyboardVisible() {
  return useSyncExternalStore(subscribeKeyboard, () => Keyboard.isVisible());
}

/**
 * 화면 맨 아래 고정 버튼 영역. 휴대폰 아래 바 높이만큼 띄우고 여백을 더한다.
 * 키보드가 올라와 있으면 아래 바 여백은 빼서 버튼이 키보드 바로 위에 오게 한다.
 * 이 컴포넌트를 쓰는 화면은 SafeAreaView에 edges={['top']}만 준다 (아래 여백 중복 방지).
 */
export function BottomBar({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const bottom = (keyboardVisible ? 0 : insets.bottom) + EXTRA_BOTTOM_GAP;

  return (
    <View
      className="gap-2 border-t px-5 pt-3 bg-background border-border"
      style={{ paddingBottom: bottom }}
    >
      {children}
    </View>
  );
}
