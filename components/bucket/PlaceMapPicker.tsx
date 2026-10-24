import * as Location from 'expo-location';
import { MapPin } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { Button, Icon, Text } from '@/components/atoms';
import { colors } from '@/constants/colors';
import type { PlaceInfo } from '@/lib/bucket/types';
import { getKakaoAddress } from '@/lib/kakao';
import { KAKAO_MAP_BASE_URL, kakaoMapHtml } from '@/lib/kakaoMapHtml';

/** 카카오 웹 지도용 JavaScript 키 (웹 지도 키는 원래 페이지에 드러나는 공개용이다) */
const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY ?? '';

/** react-native-webview 타입은 추가 props 기본값이 undefined라 strict에서 never가 된다. object로 고정한다 */
const MapWebView = WebView<object>;

/** 위치를 모를 때 처음 보여줄 곳: 서울시청 */
const DEFAULT_CENTER = { latitude: 37.5663, longitude: 126.9779 };
/** 결과 핀을 모아 보일 때 아래 카드에 가리지 않게 두는 여백(px) */
const CARD_PADDING = 200;
/** 핀을 누르면 지도 누르기도 같이 오는 경우가 있어서, 이 시간 안의 지도 누르기는 무시한다 */
const MARKER_PRESS_GUARD_MS = 400;

type MapMessage =
  | { type: 'ready' }
  | { type: 'center'; latitude: number; longitude: number }
  | { type: 'select'; index: number }
  | { type: 'mapPress' }
  | { type: 'error'; message: string };

type PlaceMapPickerProps = {
  /** 검색 결과. 핀으로 보여준다 */
  results: PlaceInfo[];
  onPick: (place: PlaceInfo) => void;
};

/**
 * 카카오 지도에서 장소 고르기 (WebView 안의 카카오 웹 지도).
 * - 검색 결과 핀을 누르면 그 장소를 고를 수 있다.
 * - 핀을 고르지 않았으면 화면 가운데 핀 위치를 고른다 (주소는 카카오에서 찾는다).
 */
export function PlaceMapPicker({ results, onPick }: PlaceMapPickerProps) {
  const insets = useSafeAreaInsets();
  const webRef = useRef<WebView<object>>(null);
  const lastMarkerPress = useRef(0);

  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [selected, setSelected] = useState<PlaceInfo | null>(null);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [resolving, setResolving] = useState(false);

  // HTML은 한 번만 만든다 (결과가 바뀔 때마다 지도를 다시 불러오지 않게)
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

  // 지도가 준비되면: 검색 결과가 있으면 다 보이게, 없으면 내 위치로 (권한이 이미 있을 때만)
  useEffect(() => {
    if (!ready) return;
    run(`window.DoIt2.setMarkers(${JSON.stringify(results)})`);
    if (results.length > 0) return;
    let cancelled = false;
    (async () => {
      const { granted } = await Location.getForegroundPermissionsAsync();
      if (!granted || cancelled) return;
      const pos = await Location.getLastKnownPositionAsync();
      if (!pos || cancelled) return;
      run(
        `window.DoIt2.panTo(${pos.coords.latitude}, ${pos.coords.longitude})`
      );
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ready, results]);

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
      case 'center':
        setCenter({ latitude: message.latitude, longitude: message.longitude });
        break;
      case 'select': {
        const place = results[message.index];
        if (!place) return;
        lastMarkerPress.current = Date.now();
        setSelected(place);
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

  const pickCenter = async () => {
    setResolving(true);
    try {
      const { address, buildingName } = await getKakaoAddress(
        center.latitude,
        center.longitude
      );
      onPick({
        kakaoId: null,
        name: buildingName || '지도에서 고른 곳',
        category: '',
        address: address || '주소를 찾지 못한 곳',
        latitude: center.latitude,
        longitude: center.longitude,
      });
    } catch {
      Alert.alert(
        '주소를 찾지 못했어요',
        '인터넷 연결을 확인하고 다시 시도해주세요.'
      );
    } finally {
      setResolving(false);
    }
  };

  if (!KAKAO_JS_KEY || mapError) {
    return (
      <View className="flex-1 items-center justify-center gap-2 px-8">
        <Text weight="700" size={17}>
          카카오 지도를 열지 못했어요
        </Text>
        <Text variant="muted" className="text-center">
          {!KAKAO_JS_KEY
            ? '.env에 EXPO_PUBLIC_KAKAO_JS_KEY(카카오 JavaScript 키)를 넣어주세요.'
            : `카카오 개발자 콘솔 → 플랫폼 → Web에\n${KAKAO_MAP_BASE_URL} 이 등록돼 있는지 확인해주세요.`}
        </Text>
        <Text variant="muted" size={12} className="text-center">
          목록에서 고르는 건 그대로 쓸 수 있어요.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <MapWebView
        ref={webRef}
        source={{ html, baseUrl: KAKAO_MAP_BASE_URL }}
        originWhitelist={['*']}
        onMessage={onMessage}
        // 지도 안에서 움직일 때 바깥 화면이 같이 끌려가지 않게
        overScrollMode="never"
        bounces={false}
        style={{ flex: 1 }}
      />

      {/* 가운데 핀: 핀 끝이 정확히 지도 가운데를 가리키도록 아이콘 높이만큼 올린다 */}
      {!selected ? (
        <View
          pointerEvents="none"
          className="absolute inset-0 items-center justify-center"
        >
          <View style={{ marginBottom: 36 }}>
            <Icon
              as={MapPin}
              size={36}
              className="text-primary"
              fill={colors.white}
            />
          </View>
        </View>
      ) : null}

      <View
        className="absolute bottom-0 left-0 right-0 gap-3 rounded-t-3xl px-5 pt-4 bg-background"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        {selected ? (
          <>
            <View className="gap-0.5">
              <Text weight="700" size={17} numberOfLines={1}>
                {selected.name}
              </Text>
              <Text variant="muted" size={13} numberOfLines={1}>
                {[selected.category, selected.address]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
            <Button label="이 장소로 고르기" onPress={() => onPick(selected)} />
          </>
        ) : (
          <>
            <Text variant="muted" size={13}>
              {results.length > 0
                ? '핀을 눌러 고르거나, 지도를 움직여 가운데 핀을 맞춰요'
                : '지도를 움직여 가운데 핀을 원하는 곳에 맞춰요'}
            </Text>
            <Button
              label={resolving ? '주소 찾는 중…' : '이 위치로 고르기'}
              disabled={resolving}
              onPress={() => void pickCenter()}
            />
          </>
        )}
      </View>
    </View>
  );
}
