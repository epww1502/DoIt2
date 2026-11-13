import { ensureAiConsent } from '@/lib/aiConsent';
import { useDialogStore } from '@/lib/dialog';
import { useSettingsStore } from '@/store/useSettingsStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

/** 지금 떠 있는 팝업에서 그 글자의 버튼을 누른다 */
function press(text: string) {
  const [dialog] = useDialogStore.getState().queue;
  void dialog.buttons.find((b) => b.text === text)?.onPress?.();
}

beforeEach(() => {
  useSettingsStore.setState({ aiConsent: false });
  useDialogStore.setState({ queue: [] });
});

describe('AI 기능 동의', () => {
  it('처음 쓸 때는 물어보고, 동의하면 계속하고 다음부터는 묻지 않는다', async () => {
    const first = ensureAiConsent();
    expect(useDialogStore.getState().queue).toHaveLength(1);
    press('동의하고 계속');
    await expect(first).resolves.toBe(true);

    useDialogStore.setState({ queue: [] });
    await expect(ensureAiConsent()).resolves.toBe(true);
    expect(useDialogStore.getState().queue).toHaveLength(0);
  });

  it('취소하면 AI를 부르지 않고, 다음에 다시 물어본다', async () => {
    const first = ensureAiConsent();
    press('취소');
    await expect(first).resolves.toBe(false);
    expect(useSettingsStore.getState().aiConsent).toBe(false);

    useDialogStore.setState({ queue: [] });
    void ensureAiConsent();
    expect(useDialogStore.getState().queue).toHaveLength(1);
  });
});
