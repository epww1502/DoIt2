import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon, Text } from '@/components/atoms';
import type { HomeTip } from '@/lib/onboarding';
import { trackStep } from '@/lib/steps';
import { useSettingsStore } from '@/store/useSettingsStore';

type HomeTipCardProps = {
  tip: Exclude<HomeTip, null>;
  /** 함께 쓰는지 (말이 조금 달라진다) */
  together: boolean;
};

/**
 * 버킷리스트 위의 다음 할 일 안내 (lib/onboarding.ts의 homeTip이 고른 것 하나).
 * - pick: '오늘 뭐 하지'에서 뽑아 보기 (누르면 그 탭으로)
 * - record: 다녀온 뒤 기록 남기기 (어디를 누르면 되는지 알려준다)
 */
export function HomeTipCard({ tip, together }: HomeTipCardProps) {
  const settings = useSettingsStore.getState();
  const isPick = tip === 'pick';

  const close = () =>
    isPick ? settings.dismissPickTip() : settings.dismissRecordTip();

  return (
    <View className="mx-5 mb-4 flex-row items-center gap-3 rounded-2xl px-4 py-3 bg-accent">
      <View className="flex-1 gap-0.5">
        <Text weight="600" size={14}>
          {isPick
            ? '뭐 할지 못 정하겠다면 뽑아 보세요'
            : `다녀왔다면 ${together ? '같이 ' : ''}기록을 남겨요`}
        </Text>
        <Text size={12} className="text-muted-foreground">
          {isPick
            ? "'오늘 뭐 하지'가 담아 둔 것 중에 하나를 골라줘요"
            : '항목을 누르면 사진, 별점, 한 줄 후기를 남길 수 있어요'}
        </Text>
      </View>
      {isPick ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => {
            trackStep('tip_tapped', 'pick');
            router.navigate('/pick');
          }}
          className="rounded-full bg-primary px-3 py-1.5 active:opacity-70"
        >
          <Text weight="600" size={13} className="text-primary-foreground">
            뽑으러 가기
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="안내 닫기"
        hitSlop={8}
        onPress={close}
        className="active:opacity-60"
      >
        <Icon as={X} size={18} className="text-muted-foreground" />
      </Pressable>
    </View>
  );
}
