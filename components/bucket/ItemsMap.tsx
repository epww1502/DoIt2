import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { MapPin } from 'lucide-react-native';

import { Icon, Text } from '@/components/atoms';
import {
  itemTodos,
  type BucketItem,
  type ItemTodo,
  type PlaceInfo,
} from '@/lib/bucket/types';
import { KAKAO_MAP_BASE_URL, kakaoMapHtml } from '@/lib/kakaoMapHtml';

import { EmptyState } from './EmptyState';
import { MapError, MapLoading, useMapLoad } from './MapLoad';

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

/**
 * 할 것 위치도 핀으로 찍을지. true: 모든 할 것, 'done': 체크한 할 것만 (일지 지도),
 * false: 항목 장소만
 */
export type TodoPins = boolean | 'done';

/** 지도에 찍는 한 점: 항목의 장소, 또는 항목 안 할 것의 위치 */
type MapEntry = { item: BucketItem; place: PlaceInfo; todo?: ItemTodo };

/** 항목 장소(+ 할 것 위치)를 같은 자리끼리 묶는다 */
function groupEntries(items: BucketItem[], withTodos: TodoPins) {
  const byKey = new Map<string, MapEntry[]>();
  const put = (entry: MapEntry) => {
    const key = `${entry.place.latitude.toFixed(5)},${entry.place.longitude.toFixed(5)}`;
    const list = byKey.get(key) ?? [];
    // 같은 자리에 같은 항목이 두 번 들어가지 않게 (항목 장소 = 할 것 위치인 경우)
    if (list.some((e) => e.item.id === entry.item.id)) return;
    byKey.set(key, [...list, entry]);
  };
  for (const item of items) {
    // 일지 지도('done')에선 항목 장소는 기록을 남긴 것만
    if (item.place && (withTodos !== 'done' || item.done)) {
      put({ item, place: item.place });
    }
    if (!withTodos) continue;
    for (const todo of itemTodos(item)) {
      if (withTodos === 'done' && !todo.done) continue;
      if (todo.place) put({ item, place: todo.place, todo });
    }
  }
  return [...byKey.values()];
}

/** 지도에 찍을 곳이 하나라도 있는지 (할 것 위치 포함) */
export function hasMapSpot(items: BucketItem[], withTodos: TodoPins = false) {
  return countSpots(items, withTodos) > 0;
}

/** 핀 개수 (같은 자리는 하나로 센다) */
export function countSpots(items: BucketItem[], withTodos: TodoPins = false) {
  return groupEntries(items, withTodos).length;
}

type ItemsMapProps = {
  /** 핀으로 찍을 항목들 (장소가 없는 건 빠진다) */
  items: BucketItem[];
  /** 핀을 누르면 아래에 보여줄 한 항목 */
  renderItem: (item: BucketItem) => ReactNode;
  /** 한 핀에 여러 개일 때 위에 보여줄 글 (placeName: 그 핀의 장소 이름) */
  groupTitle: (group: BucketItem[], placeName: string) => string;
  /** 핀을 고르기 전 아래에 보여줄 안내 */
  hint: string;
  /** 아래 카드 밑 여백 (휴대폰 아래 바 등) */
  bottomInset?: number;
  /** 할 것에 붙인 위치도 핀으로 찍는다 */
  withTodos?: TodoPins;
};

/** 카카오 지도 위에 항목 핀. 핀을 누르면 아래 카드에 그 위치의 항목들 */
export function ItemsMap({
  items,
  renderItem,
  groupTitle,
  hint,
  bottomInset = 0,
  withTodos = false,
}: ItemsMapProps) {
  const webRef = useRef<WebView<object>>(null);
  const lastMarkerPress = useRef(0);
  const map = useMapLoad();
  const ready = map.ready;
  /** 누른 핀의 항목들 */
  const [selected, setSelected] = useState<MapEntry[] | null>(null);

  const spots = useMemo(
    () => groupEntries(items, withTodos),
    [items, withTodos]
  );

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
      latitude: group[0].place.latitude,
      longitude: group[0].place.longitude,
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
        map.onReady();
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
        map.fail();
        break;
    }
  };

  if (!KAKAO_JS_KEY) {
    return (
      <EmptyState
        title="지도를 열지 못했어요"
        description="잠시 후 다시 시도해주세요."
      />
    );
  }
  if (map.failed) return <MapError onRetry={map.retry} />;

  return (
    <View className="flex-1">
      <MapWebView
        key={map.key}
        ref={webRef}
        source={{ html, baseUrl: KAKAO_MAP_BASE_URL }}
        originWhitelist={['*']}
        onMessage={onMessage}
        onError={map.fail}
        overScrollMode="never"
        bounces={false}
        style={{ flex: 1 }}
      />
      {!ready ? <MapLoading /> : null}

      <View
        className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-background px-5 pt-4"
        style={{ paddingBottom: bottomInset + 12 }}
      >
        {selected ? (
          <>
            {selected.length > 1 ? (
              <Text weight="700" size={14} className="mb-2">
                {groupTitle(
                  selected.map((e) => e.item),
                  selected[0].place.name
                )}
              </Text>
            ) : null}
            {/* 여러 개면 목록으로 (많으면 스크롤) */}
            <ScrollView
              style={{ maxHeight: 260 }}
              contentContainerClassName="gap-3"
              showsVerticalScrollIndicator={selected.length > 3}
            >
              {selected.map((entry) => (
                <View key={entry.item.id} className="gap-1.5">
                  {/* 할 것 위치로 찍힌 핀이면 어떤 할 것인지 위에 적는다 */}
                  {entry.todo ? (
                    <View className="flex-row items-center gap-1">
                      <Icon as={MapPin} size={13} className="text-primary" />
                      <Text
                        weight="600"
                        size={13}
                        numberOfLines={1}
                        className="shrink text-primary"
                      >
                        할 것 · {entry.todo.text} ({entry.place.name})
                      </Text>
                    </View>
                  ) : null}
                  {renderItem(entry.item)}
                </View>
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
