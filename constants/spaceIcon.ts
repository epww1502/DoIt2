import {
  Backpack,
  Beer,
  Dog,
  Heart,
  House,
  Rainbow,
  Smartphone,
  Sparkles,
  Sprout,
  Tent,
  Users,
  type LucideIcon,
} from 'lucide-react-native';

import {
  AMBER,
  BLUE,
  CORAL,
  GREEN,
  PINK,
  PURPLE,
  TEAL,
  type Ramp,
} from '@/constants/categoryTint';

/**
 * 공간 이모지를 화면에서는 같은 결의 선 아이콘으로 그린다.
 * 서버에는 이모지 그대로 저장한다 (초대 메시지·알림·이전 버전 앱은 이모지로 보이게).
 * 목록에 없는 이모지는 그대로 글자로 보여준다.
 */
export const SPACE_ICON: Record<string, { icon: LucideIcon; ramp: Ramp }> = {
  '✨': { icon: Sparkles, ramp: AMBER },
  '🧑‍🤝‍🧑': { icon: Users, ramp: BLUE },
  '👯': { icon: Heart, ramp: PINK },
  '👨‍👩‍👧': { icon: House, ramp: CORAL },
  '🍻': { icon: Beer, ramp: AMBER },
  '🏕️': { icon: Tent, ramp: GREEN },
  '🎒': { icon: Backpack, ramp: TEAL },
  '🐶': { icon: Dog, ramp: CORAL },
  '🌈': { icon: Rainbow, ramp: PURPLE },
  '🌱': { icon: Sprout, ramp: GREEN },
  // '나만 보기'
  '📱': { icon: Smartphone, ramp: BLUE },
};
