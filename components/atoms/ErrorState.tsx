import { CloudOff, RefreshCw, TriangleAlert } from 'lucide-react-native';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { describeError } from '@/lib/errors';
import { cn } from '@/lib/utils';

import { Button } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

type ErrorStateProps = {
  /** 받은 오류. 종류에 맞는 아이콘·설명을 고른다 */
  error?: unknown;
  /** 기본: '불러오지 못했어요' */
  title?: string;
  /** 없으면 오류 종류에 맞는 설명 */
  description?: string;
  onRetry?: () => void;
  /** 다시 시도 중이면 버튼 대신 도는 표시 */
  retrying?: boolean;
  /** 아래 작은 회색 버튼 (예: 뒤로 가기) */
  secondaryLabel?: string;
  onSecondary?: () => void;
  className?: string;
};

/**
 * 화면(또는 화면 일부)을 불러오지 못했을 때 보여주는 안내.
 * 인터넷 문제면 구름 아이콘, 그 밖의 문제면 경고 아이콘.
 */
export function ErrorState({
  error,
  title = '불러오지 못했어요',
  description,
  onRetry,
  retrying,
  secondaryLabel,
  onSecondary,
  className,
}: ErrorStateProps) {
  const described = describeError(error);
  const offline = described.kind === 'network';

  return (
    <View
      accessibilityRole="alert"
      className={cn(
        'flex-1 items-center justify-center gap-2 px-8 py-16',
        className
      )}
    >
      <View className="mb-2 h-16 w-16 items-center justify-center rounded-full bg-accent">
        <Icon
          as={offline ? CloudOff : TriangleAlert}
          size={28}
          className="text-muted-foreground"
        />
      </View>
      <Text weight="700" size={18} className="text-center">
        {offline ? '인터넷에 연결되지 않았어요' : title}
      </Text>
      <Text variant="muted" className="text-center">
        {description ?? described.message}
      </Text>
      {onRetry ? (
        retrying ? (
          <View className="mt-4 h-11 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : (
          <Button
            label="다시 시도"
            size="md"
            onPress={onRetry}
            className="mt-4 min-w-[140px]"
          />
        )
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

type InlineErrorProps = {
  /** 예: '멤버를 불러오지 못했어요' */
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
};

/** 화면 일부(카드 하나, 목록 한 칸)만 실패했을 때 쓰는 작은 줄 */
export function InlineError({
  message,
  onRetry,
  retrying,
  className,
}: InlineErrorProps) {
  return (
    <View
      accessibilityRole="alert"
      className={cn(
        'flex-row items-center gap-3 rounded-2xl px-4 py-3 bg-accent',
        className
      )}
    >
      <Icon as={TriangleAlert} size={16} className="text-muted-foreground" />
      <Text size={13} className="flex-1 text-muted-foreground">
        {message}
      </Text>
      {onRetry ? (
        retrying ? (
          <ActivityIndicator size="small" />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="다시 시도"
            hitSlop={8}
            onPress={onRetry}
            className="flex-row items-center gap-1 active:opacity-60"
          >
            <Icon as={RefreshCw} size={14} className="text-primary" />
            <Text weight="600" size={13} className="text-primary">
              다시 시도
            </Text>
          </Pressable>
        )
      ) : null}
    </View>
  );
}
