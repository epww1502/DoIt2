import { ActivityIndicator, View } from 'react-native';

import { ErrorState, InlineError, Text } from '@/components/atoms';
import { describeError } from '@/lib/errors';
import { useBucketStore } from '@/store/useBucketStore';
import { useSpaceStore } from '@/store/useSpaceStore';

export type ListSync =
  | { kind: 'ok' }
  | { kind: 'loading' }
  | { kind: 'error'; error: unknown; retry: () => void };

/**
 * 지금 보는 공간 목록을 서버에서 받았는지.
 * 목록이 비어 있을 때 "정말 없음"과 "아직 못 받음"을 구분하려고 쓴다.
 */
export function useListSync(): ListSync {
  const spaceId = useBucketStore((s) => s.spaceId);
  const sync = useBucketStore((s) => s.sync);
  const spaceStatus = useSpaceStore((s) => s.status);

  // '나만 보기'는 휴대폰에만 있으니 늘 받은 상태
  if (!spaceId) return { kind: 'ok' };
  if (spaceStatus === 'loading') return { kind: 'loading' };
  if (spaceStatus === 'error') {
    return {
      kind: 'error',
      error: null,
      retry: () => void useSpaceStore.getState().init(),
    };
  }
  if (sync.status === 'loading') return { kind: 'loading' };
  if (sync.status === 'error') {
    return {
      kind: 'error',
      error: sync.error,
      retry: () =>
        void useBucketStore
          .getState()
          .pull()
          .catch(() => {}),
    };
  }
  return { kind: 'ok' };
}

/**
 * 목록이 비어 있는데 아직 못 받았거나 받는 중일 때 빈 화면 대신 보여준다.
 * 쓰는 법: items.length === 0 && sync.kind !== 'ok' ? <SyncEmpty sync={sync} /> : ...
 */
export function SyncEmpty({ sync }: { sync: ListSync }) {
  if (sync.kind === 'error') {
    return (
      <ErrorState
        error={sync.error}
        title="목록을 불러오지 못했어요"
        onRetry={sync.retry}
      />
    );
  }
  return (
    <View className="flex-1 items-center justify-center gap-3 py-16">
      <ActivityIndicator />
      <Text variant="muted">목록을 불러오고 있어요</Text>
    </View>
  );
}

/**
 * 목록은 있는데(휴대폰에 저장해 둔 것) 최신 목록을 못 받았을 때 위에 띄우는 작은 줄.
 * 인터넷 문제면 화면 위 오프라인 띠가 이미 알려주므로 띄우지 않는다.
 */
export function SyncStaleNotice({ sync }: { sync: ListSync }) {
  if (sync.kind !== 'error') return null;
  if (describeError(sync.error).kind === 'network') return null;
  return (
    <InlineError
      className="mx-5 mb-3"
      message="최신 목록을 받지 못했어요"
      onRetry={sync.retry}
    />
  );
}
