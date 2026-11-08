import { HandHeart } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon, Text } from '@/components/atoms';
import { PersonAvatar } from '@/components/space/PersonAvatar';
import { cn } from '@/lib/utils';
import type { MemberInfo } from '@/store/useMembersStore';

export type WantProps = {
  /** 하고 싶다고 한 사람 수 */
  count: number;
  /** 나도 눌렀는지 */
  mine: boolean;
  onPress: () => void;
};

/** 목록 한 줄 오른쪽의 작은 '하고 싶어요' (누르면 넣기/빼기) */
export function WantPill({ count, mine, onPress }: WantProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        mine ? `하고 싶어요 빼기, ${count}명` : `하고 싶어요 누르기, ${count}명`
      }
      accessibilityState={{ selected: mine }}
      hitSlop={8}
      onPress={onPress}
      className={cn(
        'h-7 flex-row items-center gap-1 rounded-full px-2 active:opacity-70',
        mine ? 'bg-primary' : 'bg-accent'
      )}
    >
      <Icon
        as={HandHeart}
        size={14}
        className={mine ? 'text-primary-foreground' : 'text-primary'}
      />
      {count > 0 ? (
        <Text
          size={12}
          weight="700"
          className={mine ? 'text-primary-foreground' : 'text-primary'}
        >
          {count}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** 항목 화면의 '하고 싶어요' 줄: 큰 버튼 + 누른 사람 얼굴 */
export function WantRow({
  mine,
  wanters,
  onPress,
}: {
  mine: boolean;
  wanters: MemberInfo[];
  onPress: () => void;
}) {
  const names = wanters.map((w) => (w.isMe ? '나' : w.name));
  return (
    <View className="flex-row items-center gap-3 rounded-2xl p-3 bg-accent">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: mine }}
        onPress={onPress}
        className={cn(
          'h-10 flex-row items-center gap-1.5 rounded-full px-4 active:opacity-70',
          mine ? 'bg-primary' : 'bg-background'
        )}
      >
        <Icon
          as={HandHeart}
          size={18}
          className={mine ? 'text-primary-foreground' : 'text-primary'}
        />
        <Text
          weight="700"
          size={14}
          className={mine ? 'text-primary-foreground' : 'text-primary'}
        >
          {mine ? '하고 싶어요 ✓' : '나도 하고 싶어요'}
        </Text>
      </Pressable>
      <View className="flex-1 flex-row items-center gap-1.5">
        {wanters.length > 0 ? (
          <>
            <View className="flex-row">
              {wanters.slice(0, 4).map((w, i) => (
                <View key={i} style={{ marginLeft: i === 0 ? 0 : -6 }}>
                  <PersonAvatar imagePath={w.avatarPath} size={22} />
                </View>
              ))}
            </View>
            <Text
              size={12}
              variant="muted"
              numberOfLines={2}
              className="flex-1"
            >
              {names.length <= 2
                ? `${names.join(', ')}`
                : `${names.slice(0, 2).join(', ')} 외 ${names.length - 2}명`}
            </Text>
          </>
        ) : (
          <Text size={12} variant="muted" className="flex-1">
            하고 싶으면 눌러요. 많이 받은 게 위로 오고 더 잘 뽑혀요
          </Text>
        )}
      </View>
    </View>
  );
}
