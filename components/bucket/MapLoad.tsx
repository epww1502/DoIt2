import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { ErrorState, Text } from '@/components/atoms';
import { useConnectionStore } from '@/lib/connection';

/** 이 시간 안에 지도가 안 뜨면 실패로 본다 */
const MAP_TIMEOUT_MS = 15000;

/**
 * 카카오 지도(WebView) 불러오기 상태. 실패하면 retry로 WebView를 새로 만든다.
 * <MapWebView key={map.key} onError={map.fail} ... /> 처럼 쓴다.
 */
export function useMapLoad() {
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const online = useConnectionStore((s) => s.online);

  // 너무 오래 안 뜨면 실패로
  useEffect(() => {
    if (ready || failed) return;
    const timer = setTimeout(() => setFailed(true), MAP_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [ready, failed, attempt]);

  const retry = () => {
    setFailed(false);
    setReady(false);
    setAttempt((n) => n + 1);
  };

  // 인터넷이 끊겨 실패했다가 다시 연결되면 저절로 다시 연다
  useEffect(() => {
    if (!online || !failed) return;
    const timer = setTimeout(retry, 0);
    return () => clearTimeout(timer);
  }, [online, failed]);

  return {
    key: attempt,
    ready,
    failed,
    onReady: () => setReady(true),
    fail: () => setFailed(true),
    retry,
  };
}

/** 지도가 뜨기 전 가운데 도는 표시 */
export function MapLoading() {
  return (
    <View
      pointerEvents="none"
      className="absolute inset-0 items-center justify-center gap-3 bg-background"
    >
      <ActivityIndicator />
      <Text variant="muted" size={13}>
        지도를 불러오고 있어요
      </Text>
    </View>
  );
}

/** 지도를 열지 못했을 때 (인터넷 문제면 그 안내, 아니면 일반 안내) */
export function MapError({
  onRetry,
  note,
}: {
  onRetry: () => void;
  /** 덧붙일 말 (예: 목록에서 고르는 건 그대로 쓸 수 있어요) */
  note?: string;
}) {
  const online = useConnectionStore((s) => s.online);
  return (
    <ErrorState
      error={online ? undefined : new Error('Network request failed')}
      title="지도를 열지 못했어요"
      description={
        online
          ? `잠시 후 다시 시도해주세요.${note ? `\n${note}` : ''}`
          : `인터넷 연결을 확인하고 다시 시도해주세요.${note ? `\n${note}` : ''}`
      }
      onRetry={onRetry}
    />
  );
}
