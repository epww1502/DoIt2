import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { Text } from '@/components/atoms';
import type { BucketItem } from '@/lib/bucket/types';
import { KAKAO_MAP_BASE_URL, kakaoMapHtml } from '@/lib/kakaoMapHtml';

import { EmptyState } from './EmptyState';

const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY ?? '';
const MapWebView = WebView<object>;

/** 처음 보여줄 곳 (핀이 생기면 핀들이 다 보이게 옮겨간다): 서울시청 */
const DEFAULT_CENTER = { latitude: 37.5663, longitude: 126.9779 };
/** 아래 카드에 핀이 가리지 않게 두는 여백(px) */
const CARD_PADDING = 180;
/** 핀을 누르면 지도 누르기도 같이 오는 경우가 있어서, 이 시간 안의 지도 누르기는 무시한다 */
const MARKER_PRESS_GUARD_MS = 400;

type MapMessage =
  | { type: 'ready' }
  | { type: 'center' }
  | { type: 'select'; index: number }
  | { type: 'mapPress' }
  | { type: 'error'; message: string };

/** 같은 위치(약 1m 이내)의 항목은 핀 하나로 묶는다 */
export function groupBySpot(items: BucketItem[]) {
  const byKey = new Map<string, BucketItem[]>();
  for (const it of items) {
    if (!it.place) continue;
    const key = `${it.place.latitude.toFixed(5)},${it.place.longitude.toFixed(5)}`;
    byKey.set(key, [...(byKey.get(key) ?? []), it]);
  }
  return [...byKey.values()];
}

type ItemsMapProps = {
  /** 핀으로 찍을 항목들 (장소가 없는 건 빠진다) */
  items: BucketItem[];
  /** 핀을 누르면 아래에 보여줄 한 항목 */
  renderItem: (item: BucketItem) => ReactNode;
  /** 한 핀에 여러 개일 때 위에 보여줄 글 */
  groupTitle: (group: BucketItem[]) => string;
  /** 핀을 고르기 전 아래에 보여줄 안내 */
  hint: string;
  /** 아래 카드 밑 여백 (휴대폰 아래 바 등) */
  bottomInset?: number;
};

/** 카카오 지도 위에 항목 핀. 핀을 누르면 아래 카드에 그 위치의 항목들 */
export function ItemsMap({
  items,
  renderItem,
  groupTitle,
  hint,
  bottomInset = 0,
}: ItemsMapProps) {
  const webRef = useRef<WebView<object>>(null);
  const lastMarkerPress = useRef(0);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  /** 누른 핀의 항목들 */
  const [selected, setSelected] = useState<BucketItem[] | null>(null);

  const spots = useMemo(() => groupBySpot(items), [items]);

  const html = useMemo(
    () =>
      kakaoMapHtml({
        jsKey: KAKAO_JS_KEY,
        ...DEFAULT_CENTER,
        bottomPadding: CARD_PADDING,
      }),
    []
  );

  const run = (script: string) =>
    webRef.current?.injectJavaScript(`${script}; true;`);

  useEffect(() => {
    if (!ready) return;
    const places = spots.map((group) => ({
      latitude: group[0].place!.latitude,
      longitude: group[0].place!.longitude,
    }));
    webRef.current?.injectJavaScript(
      `window.DoIt2.setMarkers(${JSON.stringify(places)}); true;`
    );
  }, [ready, spots]);

  const onMessage = (e: WebViewMessageEvent) => {
    let message: MapMessage;
    try {
      message = JSON.parse(e.nativeEvent.data) as MapMessage;
    } catch {
      return;
    }
    switch (message.type) {
      case 'ready':
        setReady(true);
        break;
      case 'select': {
        const group = spots[message.index];
        if (!group) return;
        lastMarkerPress.current = Date.now();
        setSelected(group);
        run(`window.DoIt2.highlight(${message.index})`);
        break;
      }
      case 'mapPress':
        if (Date.now() - lastMarkerPress.current < MARKER_PRESS_GUARD_MS) {
          return;
        }
        setSelected(null);
        break;
      case 'error':
        console.warn('[kakao-map]', message.message);
        setMapError(true);
        break;
    }
  };

  if (!KAKAO_JS_KEY || mapError) {
    return (
      <EmptyState
        title="지도를 열지 못했어요"
        description="인터넷 연결을 확인하고 다시 열어주세요."
      />
    );
  }

  return (
    <View className="flex-1">
      <MapWebView
        ref={webRef}
        source={{ html, baseUrl: KAKAO_MAP_BASE_URL }}
        originWhitelist={['*']}
        onMessage={onMessage}
        overScrollMode="never"
        bounces={false}
        style={{ flex: 1 }}
      />

      <View
        className="absolute bottom-0 left-0 right-0 rounded-t-3xl px-5 pt-4 bg-background"
        style={{ paddingBottom: bottomInset + 12 }}
      >
        {selected ? (
          <>
            {selected.length > 1 ? (
              <Text weight="700" size={14} className="mb-2">
                {groupTitle(selected)}
              </Text>
            ) : null}
            {/* 여러 개면 목록으로 (많으면 스크롤) */}
            <ScrollView
              style={{ maxHeight: 260 }}
              contentContainerClassName="gap-3"
              showsVerticalScrollIndicator={selected.length > 3}
            >
              {selected.map((item) => (
                <View key={item.id}>{renderItem(item)}</View>
              ))}
            </ScrollView>
          </>
        ) : (
          <Text variant="muted" size={13} className="py-3 text-center">
            {hint}
          </Text>
        )}
      </View>
    </View>
  );
}
