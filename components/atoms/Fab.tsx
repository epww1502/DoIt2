import { Plus } from 'lucide-react-native';
import { Pressable, type PressableProps } from 'react-native';

import { cn } from '@/lib/utils';

import { Icon } from './Icon';

type FabProps = Omit<PressableProps, 'children'> & {
  accessibilityLabel: string;
  className?: string;
};

/** 오른쪽 아래 + 플로팅 버튼 */
export function Fab({ className, ...props }: FabProps) {
  return (
    <Pressable
      accessibilityRole="button"
      className={cn(
        'h-14 w-14 items-center justify-center rounded-full bg-primary',
        className
      )}
      {...props}
    >
      <Icon as={Plus} size={26} className="text-primary-foreground" />
    </Pressable>
  );
}
