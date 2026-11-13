/**
 * AI 기능을 처음 쓸 때 한 번, 글이 외부 AI 서비스로 전달된다는 것을 알리고 동의를 받는다.
 * (App Store 심사 지침: 개인 데이터를 외부 AI에 보내기 전에 알리고 허락을 받아야 한다)
 * 동의는 이 휴대폰에 저장하고 다시 묻지 않는다.
 */
import { showAlert } from '@/lib/dialog';
import { useSettingsStore } from '@/store/useSettingsStore';

/** 이미 동의했으면 바로 true, 아니면 물어보고 답을 돌려준다 */
export function ensureAiConsent(): Promise<boolean> {
  const { aiConsent, setAiConsent } = useSettingsStore.getState();
  if (aiConsent) return Promise.resolve(true);
  return new Promise((resolve) =>
    showAlert(
      'AI 기능을 쓸까요?',
      'AI 기능을 쓰면 항목 이름과 직접 쓴 글이 AI 서비스(Anthropic)로 전달돼요. 버튼을 눌렀을 때만 보내고, 닉네임·사진·위치는 보내지 않아요.',
      [
        { text: '취소', style: 'cancel', onPress: () => resolve(false) },
        {
          text: '동의하고 계속',
          onPress: () => {
            setAiConsent(true);
            resolve(true);
          },
        },
      ],
      { cancelable: false }
    )
  );
}
