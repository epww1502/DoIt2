import { useLocalSearchParams } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { Icon, NavBar, Text } from '@/components/atoms';
import { EmptyState } from '@/components/bucket/EmptyState';
import { MapError, MapLoading, useMapLoad } from '@/components/bucket/MapLoad';
import { itemTodos } from '@/lib/bucket/types';
import { kakaoCourseHtml } from '@/lib/kakaoCourseHtml';
import { KAKAO_MAP_BASE_URL } from '@/lib/kakaoMapHtml';
import { openPlace } from '@/lib/openPlace';
import { cn } from '@/lib/utils';
import { useBucketItem } from '@/store/useBucketStore';
import { usePrimaryColor } from '@/store/useSettingsStore';

const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY ?? '';
const MapWebView = WebView<object>;

/** 아래 목록이 가리는 높이 (핀들을 이만큼 위로 모은다) */
const LIST_HEIGHT = 260;

/**
 * 코스 보기: 위치를 정한 할 것을 순서대로 번호 핀으로 찍고 선으로 잇는다.
 * 핀이나 아래 목록을 누르면 그곳을 지도 앱으로 연다.
 * 순서는 수정 화면의 '순서 바꾸기'로 바꾼다.
 */
export default function CourseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useBucketItem(id);
  const primary = usePrimaryColor();
  const insets = useSafeAreaInsets();
  const map = useMapLoad();

  const stops = useMemo(() => itemTodos(item).filter((t) => t.place), [item]);

  // 할 것 위치가 바뀔 때만 지도를 새로 그린다 (체크만 바꿨을 땐 그대로)
  const placesKey = JSON.stringify(
    stops.map((t) => [t.place!.latitude, t.place!.longitude])
  );
  const html = useMemo(
    () =>
      kakaoCourseHtml({
        jsKey: KAKAO_JS_KEY,
        stops: stops.map((t) => ({
          latitude: t.place!.latitude,
          longitude: t.place!.longitude,
        })),
        color: primary,
        bottomPadding: LIST_HEIGHT,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [placesKey, primary]
  );

  const title = item ? `${item.title} 코스` : '코스';

  if (!item || stops.length === 0 || !KAKAO_JS_KEY) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <NavBar title={title} />
        <EmptyState
          title="코스로 볼 곳이 없어요"
          description={'수정 화면에서 할 것마다 핀을 눌러\n위치를 정해보세요.'}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar title={title} />
      <View className="flex-1">
        {map.failed ? (
          <MapError onRetry={map.retry} />
        ) : (
          <>
            <MapWebView
              key={`${map.key}-${placesKey}`}
              source={{ html, baseUrl: KAKAO_MAP_BASE_URL }}
              originWhitelist={['*']}
              onMessage={(e) => {
                let message: { type: string; index?: number };
                try {
                  message = JSON.parse(e.nativeEvent.data);
                } catch {
                  return;
                }
                if (message.type === 'ready') map.onReady();
                else if (message.type === 'error') map.fail();
                else if (message.type === 'select') {
                  const stop = stops[message.index ?? -1];
                  if (stop?.place) openPlace(stop.place);
                }
              }}
              onError={map.fail}
              overScrollMode="never"
              bounces={false}
              style={{ flex: 1 }}
            />
            {!map.ready ? <MapLoading /> : null}
          </>
        )}

        <View
          className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-background px-5 pt-4"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <ScrollView
            style={{ maxHeight: LIST_HEIGHT - 40 }}
            contentContainerClassName="gap-1"
          >
            {stops.map((todo, i) => (
              <Pressable
                key={todo.id}
                accessibilityRole="button"
                accessibilityLabel={`${i + 1}번 ${todo.text} 지도에서 보기`}
                onPress={() => openPlace(todo.place!)}
                className="flex-row items-center gap-3 rounded-2xl py-2 active:opacity-60"
              >
                <View
                  className={cn(
                    'h-7 w-7 items-center justify-center rounded-full',
                    todo.done ? 'bg-accent' : 'bg-primary'
                  )}
                >
                  {/* 번호는 늘 보이고, 한 곳은 옅게 */}
                  <Text
                    weight="700"
                    size={13}
                    className={todo.done ? 'text-primary' : 'text-white'}
                  >
                    {i + 1}
                  </Text>
                </View>
                <View className="flex-1 gap-0.5">
                  <Text
                    weight="600"
                    size={15}
                    numberOfLines={1}
                    className={cn(
                      todo.done && 'line-through text-muted-foreground'
                    )}
                  >
                    {todo.text}
                  </Text>
                  <Text variant="muted" size={12} numberOfLines={1}>
                    {todo.place!.name}
                  </Text>
                </View>
                <Icon
                  as={ChevronRight}
                  size={18}
                  className="text-muted-foreground"
                />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}
