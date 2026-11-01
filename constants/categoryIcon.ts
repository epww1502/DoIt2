import {
  Camera,
  ChefHat,
  Clapperboard,
  Coffee,
  Dumbbell,
  FerrisWheel,
  Palette,
  PartyPopper,
  Plane,
  Sparkles,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react-native';

import type { CategoryKey } from '@/lib/bucket/types';

/** 카테고리마다 쓰는 선 아이콘 (탭바·버튼 아이콘과 같은 그림체) */
export const CATEGORY_ICON: Record<CategoryKey, LucideIcon> = {
  food: UtensilsCrossed,
  cafe: Coffee,
  trip: Plane,
  activity: FerrisWheel,
  culture: Clapperboard,
  cook: ChefHat,
  exercise: Dumbbell,
  hobby: Palette,
  memory: Camera,
  event: PartyPopper,
  etc: Sparkles,
};
