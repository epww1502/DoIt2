import { Heart } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon, Text } from '@/components/atoms';

/** 사진 위에 얹는 하트 수 (하트가 없으면 그리지 않는다) */
export function LikeCount({
  count,
  small = false,
}: {
  count: number;
  small?: boolean;
}) {
  if (count <= 0) return null;
  return (
    <View
      className={
        small
          ? 'bg-black/55 flex-row items-center gap-0.5 rounded-full px-1.5 py-0.5'
          : 'flex-row items-center gap-1 rounded-full bg-black/60 px-2.5 py-1'
      }
    >
      <Icon
        as={Heart}
        size={small ? 10 : 13}
        className="text-white"
        fill="#ffffff"
      />
      <Text size={small ? 10 : 12} weight="600" className="text-white">
        {count}
      </Text>
    </View>
  );
}
