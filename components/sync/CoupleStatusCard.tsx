import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon, Text } from '@/components/atoms';
import { cn } from '@/lib/utils';
import { useCoupleStore } from '@/store/useCoupleStore';

/** 지금 커플 연결 상태 한 줄 요약 */
export function useCoupleSummary() {
  const status = useCoupleStore((s) => s.status);
  const couple = useCoupleStore((s) => s.couple);
  const memberCount = useCoupleStore((s) => s.memberCount);

  if (status === 'unconfigured')
    return { connected: false, emoji: '📱', text: '이 휴대폰에만 저장돼요' };
  if (status === 'loading')
    return {
      connected: false,
      emoji: '⏳',
      text: '연결 상태를 확인하고 있어요',
    };
  if (status === 'error')
    return { connected: false, emoji: '⚠️', text: '서버에 연결하지 못했어요' };
  if (couple && memberCount >= 2)
    return { connected: true, emoji: '💑', text: '둘이 같이 쓰고 있어요' };
  if (couple)
    return {
      connected: false,
      emoji: '💌',
      text: `상대를 기다리는 중 · 코드 ${couple.invite_code}`,
    };
  return {
    connected: false,
    emoji: '💞',
    text: '커플을 연결하면 둘이 같이 볼 수 있어요',
  };
}

/** 누르면 커플 연결 화면으로 가는 카드 */
export function CoupleStatusCard({ className }: { className?: string }) {
  const { emoji, text } = useCoupleSummary();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/couple')}
      className={cn(
        'flex-row items-center gap-3 rounded-2xl px-4 py-3 bg-accent active:opacity-70',
        className
      )}
    >
      <Text size={22}>{emoji}</Text>
      <View className="flex-1 gap-0.5">
        <Text weight="600" size={14}>
          커플 연결
        </Text>
        <Text size={12} className="text-muted-foreground" numberOfLines={1}>
          {text}
        </Text>
      </View>
      <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
    </Pressable>
  );
}
