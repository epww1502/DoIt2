import { useSettingsStore } from '@/store/useSettingsStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

/** 휴대폰에 저장되는 칸들 */
function persisted() {
  const { partialize } = useSettingsStore.persist.getOptions();
  return partialize!(useSettingsStore.getState()) as Record<string, unknown>;
}

describe('설정 저장', () => {
  it('한 번 보거나 닫은 것은 앱을 다시 켜도 남는다', () => {
    // 빠지면 켤 때마다 닫은 안내가 다시 뜨고, 별점을 다시 묻는다
    expect(Object.keys(persisted())).toEqual(
      expect.arrayContaining([
        'welcomed',
        'inviteCardHidden',
        'spaceTipPending',
        'guided',
        'pickTried',
        'pickTipDismissed',
        'recordTipDismissed',
        'reviewAsked',
      ])
    );
  });

  it('값이 든 칸은 모두 저장한다 (새 칸을 만들고 저장 목록에 빠뜨리지 않게)', () => {
    const state = useSettingsStore.getState() as unknown as Record<
      string,
      unknown
    >;
    const values = Object.keys(state).filter(
      (key) => typeof state[key] !== 'function'
    );
    expect(Object.keys(persisted()).sort()).toEqual(values.sort());
  });
});
