import { cn } from '@/lib/utils';
import { View, ViewProps } from 'react-native';

function Separator({ className, ...props }: ViewProps) {
  return <View className={cn('h-px bg-border', className)} {...props} />;
}

export { Separator };
