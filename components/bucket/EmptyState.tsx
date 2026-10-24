import { Pressable, View } from 'react-native';

import { Button, Text } from '@/components/atoms';

type EmptyStateProps = {
  /** 없으면 아이콘 없이 글자만 */
  emoji?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  /** 주 버튼 아래 보조 버튼 (작은 회색 글씨) */
  secondaryLabel?: string;
  onSecondary?: () => void;
};

export function EmptyState({
  emoji,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center gap-2 px-8 py-16">
      {emoji ? <Text size={48}>{emoji}</Text> : null}
      <Text weight="700" size={18} className={emoji ? 'mt-2' : undefined}>
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
      {secondaryLabel && onSecondary ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={onSecondary}
          className="mt-2 px-3 py-2 active:opacity-60"
        >
          <Text size={13} className="text-muted-foreground">
            {secondaryLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
