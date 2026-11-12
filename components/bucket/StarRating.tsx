import { Star } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/atoms';
import { usePrimaryColor } from '@/store/useSettingsStore';

/** 별점마다 붙는 말 (0은 비움) */
export const RATING_LABELS = [
  '',
  '별로였어요',
  '그저 그랬어요',
  '괜찮았어요',
  '좋았어요',
  '최고였어요!',
];

type StarRatingProps = {
  value: number;
  /** 없으면 읽기 전용 */
  onChange?: (value: number) => void;
  size?: number;
};

export function StarRating({ value, onChange, size = 16 }: StarRatingProps) {
  const primary = usePrimaryColor();
  return (
    <View className="flex-row gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const star = (
          <Icon
            as={Star}
            size={size}
            className={filled ? 'text-primary' : 'text-muted'}
            fill={filled ? primary : 'transparent'}
          />
        );
        if (!onChange) return <View key={n}>{star}</View>;
        return (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityLabel={`별점 ${n}점`}
            accessibilityState={{ selected: n === value }}
            hitSlop={4}
            onPress={() => onChange(n)}
          >
            {star}
          </Pressable>
        );
      })}
    </View>
  );
}
