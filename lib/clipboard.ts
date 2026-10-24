import { requireOptionalNativeModule } from 'expo';
import { Alert, Share } from 'react-native';

import { hapticSelect } from '@/lib/haptics';

/**
 * 글자를 복사한다. 복사 기능이 없는 예전 앱(설치한 APK에 복사 모듈이 없을 때)이면
 * 공유 창을 띄워서 거기서 복사하게 한다.
 */
export async function copyText(text: string, doneMessage = '복사했어요') {
  // 예전 빌드에서 바로 불러오면 앱이 멈추니, 모듈이 있을 때만 불러온다
  if (requireOptionalNativeModule('ExpoClipboard')) {
    const Clipboard = await import('expo-clipboard');
    await Clipboard.setStringAsync(text);
    hapticSelect();
    Alert.alert(doneMessage, text);
    return;
  }
  await Share.share({ message: text });
}
