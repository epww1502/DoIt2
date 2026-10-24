import dayjs from 'dayjs';
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { Icon, NavBar, Text } from '@/components/atoms';
import { PhotoImage } from '@/components/bucket/DonePhoto';
import { EmptyState } from '@/components/bucket/EmptyState';
import { StarRating } from '@/components/bucket/StarRating';
import { recordPhotos, type BucketItem } from '@/lib/bucket/types';
import { KAKAO_MAP_BASE_URL, kakaoMapHtml } from '@/lib/kakaoMapHtml';
import { useBucketStore } from '@/store/useBucketStore';

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

/** 함께한 곳 지도: 장소를 골라둔 기록들을 핀으로. 핀을 누르면 아래에 그 기록 */
export default function DoneMapScreen() {
  const items = useBucketStore((s) => s.items);
  const insets = useSafeAreaInsets();
  const webRef = useRef<WebView<object>>(null);
  const lastMarkerPress = useRef(0);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [selected, setSelected] = useState<BucketItem | null>(null);

  // 장소 좌표가 있는 함께한 기록 (최근 순)
  const visited = useMemo(
    () =>
      items
        .filter((it) => it.done && it.place)
        .sort((a, b) => (b.done!.date > a.done!.date ? 1 : -1)),
    [items]
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
    const places = visited.map((it) => ({
      latitude: it.place!.latitude,
      longitude: it.place!.longitude,
    }));
    webRef.current?.injectJavaScript(
      `window.DoIt2.setMarkers(${JSON.stringify(places)}); true;`
    );
  }, [ready, visited]);

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
        const item = visited[message.index];
        if (!item) return;
        lastMarkerPress.current = Date.now();
        setSelected(item);
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

  if (visited.length === 0) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <NavBar title="함께한 곳 지도" />
        <EmptyState
          title="지도에 찍을 곳이 아직 없어요"
          description={
            '장소를 골라둔 항목에 기록을 남기면\n여기에 핀으로 모여요.'
          }
        />
      </SafeAreaView>
    );
  }

  if (!KAKAO_JS_KEY || mapError) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <NavBar title="함께한 곳 지도" />
        <EmptyState
          title="지도를 열지 못했어요"
          description="인터넷 연결을 확인하고 다시 열어주세요."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar title={`함께한 곳 ${visited.length}곳`} />
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
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          {selected ? (
            <VisitedCard item={selected} />
          ) : (
            <Text variant="muted" size={13} className="py-3 text-center">
              핀을 누르면 그날의 기록을 볼 수 있어요
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

/** 고른 핀의 기록 요약. 누르면 항목 화면으로 */
function VisitedCard({ item }: { item: BucketItem }) {
  const done = item.done!;
  const photo = recordPhotos(done)[0];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        router.push({ pathname: '/item/[id]', params: { id: item.id } })
      }
      className="flex-row items-center gap-3 active:opacity-70"
    >
      {photo ? (
        <View className="h-16 w-16 overflow-hidden rounded-xl bg-accent">
          <PhotoImage photo={photo} style={{ width: 64, height: 64 }} />
        </View>
      ) : null}
      <View className="flex-1 gap-1">
        <Text weight="700" size={16} numberOfLines={1}>
          {item.title}
        </Text>
        <Text variant="muted" size={12} numberOfLines={1}>
          {[dayjs(done.date).format('YYYY년 M월 D일'), item.place?.name]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        <StarRating value={done.rating} size={13} />
      </View>
      <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
    </Pressable>
  );
}
