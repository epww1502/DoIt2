import { Flag, MapPin, type LucideIcon } from 'lucide-react-native';

import type { BucketKind } from '@/lib/bucket/types';

/** 가보기 / 해보기 선 아이콘 (이모지 대신, 앱의 다른 아이콘과 같은 스타일) */
export const KIND_ICON: Record<BucketKind, LucideIcon> = {
  place: MapPin,
  activity: Flag,
};
