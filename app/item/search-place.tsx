import { router, useLocalSearchParams } from 'expo-router';
import { Clock, MapPin, Search } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { FlatList, Keyboard, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, NavBar, Segmented, Text, TextField } from '@/components/atoms';
import { EmptyState } from '@/components/bucket/EmptyState';
import { PlaceMapPicker } from '@/components/bucket/PlaceMapPicker';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import type { PlaceInfo } from '@/lib/bucket/types';
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
  | { status: 'error' }
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
  const signedIn = useSpaceStore((s) => s.status === 'ready');
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
        .catch((e) => {
          if (controller.signal.aborted) return;
          setState({
            status: e instanceof KakaoKeyMissingError ? 'no-key' : 'error',
          });
        });
    }, SEARCH_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, signedIn]);

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
    empty = (
      <EmptyState
        emoji="📡"
        title="서버에 연결해야 검색할 수 있어요"
        description="인터넷 연결을 확인해주세요. 설정 → 공간에서 상태를 볼 수 있어요."
      />
    );
  } else if (state.status === 'no-key' && trimmed) {
    empty = (
      <EmptyState
        emoji="🔑"
        title="카카오 API 키가 필요해요"
        description={
          'Supabase 대시보드 → Edge Functions → Secrets에\nKAKAO_REST_API_KEY를 넣어주세요.'
        }
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
    empty = <EmptyState emoji="⏳" title="찾고 있어요" description="" />;
  } else if (state.status === 'error') {
    empty = (
      <EmptyState
        emoji="😢"
        title="검색하지 못했어요"
        description="인터넷 연결을 확인하고 다시 시도해주세요."
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
          <PlaceMapPicker results={results} onPick={choose} />
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
