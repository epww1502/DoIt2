import { useEffect } from 'react';
import { Linking } from 'react-native';

import { showAlert } from '@/lib/dialog';
import { useBucketStore, useBucketStoreHydrated } from '@/store/useBucketStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useSpaceStore } from '@/store/useSpaceStore';

/** 지금 방침의 시행일. 방침을 바꾸면 이 날짜와 아래 문구를 바꾼다 (바꾸면 한 번 더 알린다) */
const POLICY_DATE = '2026-11-13';
const POLICY_URL = 'https://doit2app.github.io/privacy.html';

/**
 * 화면 없이, 개인정보처리방침이 바뀐 것을 한 번 알리는 컴포넌트 (루트 레이아웃에 한 번).
 * 바뀌기 전부터 쓰던 사람(담아 둔 게 있거나 공간에 들어가 있는 사람)에게만 알리고,
 * 새로 시작한 사람은 알림 없이 본 것으로 해 둔다.
 */
export function PolicyNotice() {
  const hydrated = useBucketStoreHydrated();
  const ready = useSpaceStore((s) => s.status === 'ready');

  useEffect(() => {
    if (!hydrated || !ready) return;
    const check = () => {
      const { policyNoticeSeen, setPolicyNoticeSeen } =
        useSettingsStore.getState();
      if (policyNoticeSeen === POLICY_DATE) return;
      setPolicyNoticeSeen(POLICY_DATE);

      const { items, cache } = useBucketStore.getState();
      const existing =
        items.length > 0 ||
        Object.values(cache).some((list) => list.length > 0) ||
        useSpaceStore.getState().spaces.length > 0;
      if (!existing) return;
      showAlert(
        '개인정보처리방침이 바뀌었어요',
        'AI 기능(AI로 채우기, 추천, 여러 개 담기)이 생겼어요. 이 기능을 쓸 때만 항목 이름과 직접 쓴 글이 AI 서비스(Anthropic)로 전달돼요. 2026년 11월 13일부터 적용돼요.',
        [
          {
            text: '자세히 보기',
            onPress: () => void Linking.openURL(POLICY_URL).catch(() => {}),
          },
          { text: '확인', style: 'cancel' },
        ]
      );
    };
    // 설정을 다 불러온 뒤에 본다 (불러오기 전에는 '본 적 없음'으로 보여서 매번 뜰 수 있다)
    if (useSettingsStore.persist.hasHydrated()) check();
    else return useSettingsStore.persist.onFinishHydration(check);
  }, [hydrated, ready]);

  return null;
}
