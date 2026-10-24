import { router, useLocalSearchParams } from 'expo-router';
import { Clock, MapPin, Search } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ErrorState,
  Icon,
  InlineError,
  NavBar,
  Segmented,
  Text,
  TextField,
} from '@/components/atoms';
import { EmptyState } from '@/components/bucket/EmptyState';
import { PlaceMapPicker } from '@/components/bucket/PlaceMapPicker';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import type { PlaceInfo } from '@/lib/bucket/types';
import { noteFailure, useConnectionStore } from '@/lib/connection';
import { describeError } from '@/lib/errors';
import { KakaoKeyMissingError, searchKakaoPlaces } from '@/lib/kakao';
import { useSpaceStore } from '@/store/useSpaceStore';
import { usePlacePickStore } from '@/store/usePlacePickStore';
import {
  useRecentPlaces,
  useRecentPlacesStore,
} from '@/store/useRecentPlacesStore';

/** 입력을 멈추고 이만큼 기다린 뒤 검색한다 */
const SEARCH_DELAY_MS = 350;

type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  /** 서버(Edge Function)에 카카오 키가 아직 없다 */
  | { status: 'no-key' }
  | { status: 'done'; results: PlaceInfo[] };

type SearchView = 'list' | 'map';

// 지도가 먼저 (처음 열면 지도로)
const VIEW_OPTIONS: { value: SearchView; label: string }[] = [
  { value: 'map', label: '🗺️ 지도' },
  { value: 'list', label: '📋 목록' },
];

/** 카카오 장소 검색 (목록/지도). ?q= 로 첫 검색어를 받을 수 있다 */
export default function SearchPlaceScreen() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const pick = usePlacePickStore((state) => state.pick);
  // 검색은 서버를 거치므로 로그인(익명)이 끝나야 한다
  const spaceStatus = useSpaceStore((s) => s.status);
  const signedIn = spaceStatus === 'ready';
  /** '다시 시도'를 누를 때마다 올려서 같은 검색어로 다시 검색한다 */
  const [attempt, setAttempt] = useState(0);
  const retry = () => setAttempt((n) => n + 1);
  const keyboardHeight = useKeyboardHeight();
  // 검색창은 비워서 시작한다 (바로 검색하지 않고 최근 장소를 먼저 보여준다).
  // 넘겨받은 이름(q)은 '검색하기' 버튼으로 한 번에 검색할 수 있게 둔다
  const [query, setQuery] = useState('');
  const suggestion = q?.trim() ?? '';
  const [state, setState] = useState<SearchState>({ status: 'idle' });
  const [view, setView] = useState<SearchView>('map');

  const changeView = (next: SearchView) => {
    // 지도로 바꾸면 키보드를 내려서 지도를 넓게 본다
    if (next === 'map') Keyboard.dismiss();
    setView(next);
  };

  const trimmed = query.trim();

  useEffect(() => {
    if (!trimmed || !signedIn) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setState({ status: 'loading' });
      searchKakaoPlaces(trimmed, controller.signal)
        .then((results) => setState({ status: 'done', results }))
        .catch((e: unknown) => {
          if (controller.signal.aborted) return;
          if (e instanceof KakaoKeyMissingError) {
            setState({ status: 'no-key' });
            return;
          }
          noteFailure(e);
          setState({ status: 'error', error: e });
        });
    }, SEARCH_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, signedIn, attempt]);

  // 인터넷 문제로 실패했다가 다시 연결되면 저절로 다시 검색한다
  const online = useConnectionStore((s) => s.online);
  const failed = state.status === 'error';
  useEffect(() => {
    if (!online || !failed) return;
    const timer = setTimeout(retry, 0);
    return () => clearTimeout(timer);
  }, [online, failed]);

  // 검색어가 없을 때 보여줄 최근 장소 (고른 장소 + 항목·기록에 붙은 장소)
  const recent = useRecentPlaces();
  const addRecent = useRecentPlacesStore((s) => s.add);
  const clearRecent = useRecentPlacesStore((s) => s.clear);
  const hasPickedHistory = useRecentPlacesStore((s) => s.picked.length > 0);
  const showingRecent = !trimmed && recent.length > 0;

  const choose = (place: PlaceInfo) => {
    addRecent(place);
    pick(place);
    router.back();
  };

  let empty: React.ReactNode = null;
  if (!signedIn) {
    empty =
      spaceStatus === 'error' ? (
        <ErrorState
          title="서버에 연결하지 못했어요"
          description="장소 검색은 서버에 연결돼야 할 수 있어요."
          onRetry={() => void useSpaceStore.getState().init()}
        />
      ) : (
        <View className="flex-1 items-center justify-center gap-3 py-16">
          <ActivityIndicator />
          <Text variant="muted">서버에 연결하는 중이에요</Text>
        </View>
      );
  } else if (state.status === 'no-key' && trimmed) {
    empty = (
      <ErrorState
        title="지금은 장소 검색을 쓸 수 없어요"
        description={
          __DEV__
            ? 'Supabase 대시보드 → Edge Functions → Secrets에\nKAKAO_REST_API_KEY를 넣어주세요.'
            : '잠시 후 다시 시도해주세요. 계속 안 되면 doit2team@gmail.com으로 알려주세요.'
        }
        onRetry={retry}
      />
    );
  } else if (!trimmed || state.status === 'idle') {
    empty = (
      <EmptyState
        emoji="🔎"
        title="가게나 장소 이름을 검색해요"
        description="예) 성수 파스타, 서울숲, 롯데월드"
      />
    );
  } else if (state.status === 'loading') {
    empty = (
      <View className="flex-1 items-center justify-center gap-3 py-16">
        <ActivityIndicator />
        <Text variant="muted">찾고 있어요</Text>
      </View>
    );
  } else if (state.status === 'error') {
    empty = (
      <ErrorState
        error={state.error}
        title="검색하지 못했어요"
        onRetry={retry}
      />
    );
  } else {
    empty = (
      <EmptyState
        emoji="🫥"
        title="검색 결과가 없어요"
        description="다른 이름으로 검색해봐요."
      />
    );
  }

  const results = trimmed
    ? state.status === 'done'
      ? state.results
      : []
    : recent;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar title="장소 검색" />
      <View className="gap-3 px-5 pb-3">
        <TextField
          variant="search"
          value={query}
          onChangeText={setQuery}
          placeholder="가게, 장소 이름"
          autoFocus={view === 'list'}
          returnKeyType="search"
          onSubmitEditing={() => Keyboard.dismiss()}
        />
        {suggestion && !trimmed ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setQuery(suggestion)}
            className="flex-row items-center gap-1.5 self-start rounded-full px-3 py-1.5 bg-accent active:opacity-70"
          >
            <Icon as={Search} size={14} className="text-primary" />
            <Text
              size={13}
              weight="600"
              className="text-primary"
              numberOfLines={1}
            >
              {`'${suggestion}' 검색하기`}
            </Text>
          </Pressable>
        ) : null}
        <Segmented options={VIEW_OPTIONS} value={view} onChange={changeView} />
      </View>
      {view === 'map' ? (
        // 지도: 검색 결과는 핀으로, 검색 없이도 가운데 핀으로 직접 고를 수 있다
        signedIn ? (
          <View className="flex-1">
            <PlaceMapPicker results={results} onPick={choose} />
            {/* 지도 위에 검색 상태를 띄운다 (실패를 '결과 없음'처럼 보이지 않게) */}
            {trimmed ? <MapSearchStatus state={state} onRetry={retry} /> : null}
          </View>
        ) : (
          empty
        )
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) =>
            item.kakaoId ?? `${item.latitude},${item.longitude}`
          }
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="grow px-5"
          contentContainerStyle={{ paddingBottom: keyboardHeight + 24 }}
          ItemSeparatorComponent={() => <View className="h-px bg-border" />}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => choose(item)}
              className="flex-row items-center gap-3 py-3 active:opacity-60"
            >
              <Icon
                as={showingRecent ? Clock : MapPin}
                size={18}
                className={
                  showingRecent ? 'text-muted-foreground' : 'text-primary'
                }
              />
              <View className="flex-1 gap-0.5">
                <Text weight="600" size={15} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text variant="muted" size={12} numberOfLines={1}>
                  {[item.category, item.address].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </Pressable>
          )}
          ListHeaderComponent={
            showingRecent ? (
              <View className="flex-row items-center justify-between pb-1 pt-2">
                <Text weight="600" size={13} className="text-muted-foreground">
                  최근 장소
                </Text>
                {hasPickedHistory ? (
                  <Pressable hitSlop={8} onPress={clearRecent}>
                    <Text size={12} className="text-muted-foreground">
                      고른 기록 지우기
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : undefined
          }
          ListEmptyComponent={<View className="flex-1">{empty}</View>}
        />
      )}
    </SafeAreaView>
  );
}

/** 지도 보기에서 검색 중·실패·결과 없음을 지도 위 작은 띠로 보여준다 */
function MapSearchStatus({
  state,
  onRetry,
}: {
  state: SearchState;
  onRetry: () => void;
}) {
  let content: React.ReactNode = null;
  if (state.status === 'loading') {
    content = (
      <View className="flex-row items-center gap-2 self-center rounded-full px-4 py-2 bg-background">
        <ActivityIndicator size="small" />
        <Text size={13}>찾고 있어요</Text>
      </View>
    );
  } else if (state.status === 'error' || state.status === 'no-key') {
    content = (
      <InlineError
        className="bg-background"
        message={
          state.status === 'error'
            ? describeError(state.error).message
            : '지금은 장소 검색을 쓸 수 없어요'
        }
        onRetry={onRetry}
      />
    );
  } else if (state.status === 'done' && state.results.length === 0) {
    content = (
      <View className="self-center rounded-full px-4 py-2 bg-background">
        <Text size={13}>검색 결과가 없어요 · 다른 이름으로 검색해봐요</Text>
      </View>
    );
  }
  if (!content) return null;
  return (
    <View
      pointerEvents="box-none"
      className="absolute left-4 right-4 top-3"
      style={{ elevation: 4 }}
    >
      {content}
    </View>
  );
}
