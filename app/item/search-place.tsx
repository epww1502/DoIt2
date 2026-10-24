import { router, useLocalSearchParams } from 'expo-router';
import { MapPin } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { FlatList, Keyboard, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, NavBar, Segmented, Text, TextField } from '@/components/atoms';
import { EmptyState } from '@/components/bucket/EmptyState';
import { PlaceMapPicker } from '@/components/bucket/PlaceMapPicker';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import type { PlaceInfo } from '@/lib/bucket/types';
import { KakaoKeyMissingError, searchKakaoPlaces } from '@/lib/kakao';
import { useCoupleStore } from '@/store/useCoupleStore';
import { usePlacePickStore } from '@/store/usePlacePickStore';

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

const VIEW_OPTIONS: { value: SearchView; label: string }[] = [
  { value: 'list', label: '📋 목록' },
  { value: 'map', label: '🗺️ 지도' },
];

/** 카카오 장소 검색 (목록/지도). ?q= 로 첫 검색어를 받을 수 있다 */
export default function SearchPlaceScreen() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const pick = usePlacePickStore((state) => state.pick);
  // 검색은 서버를 거치므로 로그인(익명)이 끝나야 한다
  const signedIn = useCoupleStore((s) => s.status === 'ready');
  const keyboardHeight = useKeyboardHeight();
  const [query, setQuery] = useState(q ?? '');
  const [state, setState] = useState<SearchState>({ status: 'idle' });
  const [view, setView] = useState<SearchView>('list');

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

  const choose = (place: PlaceInfo) => {
    pick(place);
    router.back();
  };

  let empty: React.ReactNode = null;
  if (!signedIn) {
    empty = (
      <EmptyState
        emoji="📡"
        title="서버에 연결해야 검색할 수 있어요"
        description="인터넷 연결을 확인해주세요. 설정 → 커플 연결에서 상태를 볼 수 있어요."
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

  const results = state.status === 'done' && trimmed ? state.results : [];

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
              <Icon as={MapPin} size={18} className="text-primary" />
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
          ListEmptyComponent={<View className="flex-1">{empty}</View>}
        />
      )}
    </SafeAreaView>
  );
}
