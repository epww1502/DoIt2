import { View } from 'react-native';

import { Button, Text } from '@/components/atoms';

type EmptyStateProps = {
  emoji: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  emoji,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center gap-2 px-8 py-16">
      <Text size={48}>{emoji}</Text>
      <Text weight="700" size={18} className="mt-2">
        {title}
      </Text>
      <Text variant="muted" className="text-center">
        {description}
      </Text>
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          size="md"
          onPress={onAction}
          className="mt-4"
        />
      ) : null}
    </View>
  );
}
