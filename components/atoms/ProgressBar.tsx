import { View } from 'react-native';

type ProgressBarProps = {
  /** 0~100 */
  value: number;
};

export function ProgressBar({ value }: ProgressBarProps) {
  const width = `${Math.min(100, Math.max(0, value))}%` as const;
  return (
    <View className="h-1.5 w-full overflow-hidden rounded-full bg-input">
      <View className="h-full rounded-full bg-primary" style={{ width }} />
    </View>
  );
}
