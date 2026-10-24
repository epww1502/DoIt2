import { router, useLocalSearchParams } from 'expo-router';
import { MapPin } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, NavBar, Text, TextField } from '@/components/atoms';
import { EmptyState } from '@/components/bucket/EmptyState';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import type { PlaceInfo } from '@/lib/bucket/types';
import { hasKakaoKey, searchKakaoPlaces } from '@/lib/kakao';
import { usePlacePickStore } from '@/store/usePlacePickStore';

/** 입력을 멈추고 이만큼 기다린 뒤 검색한다 */
const SEARCH_DELAY_MS = 350;

type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'done'; results: PlaceInfo[] };

/** 카카오 장소 검색. ?q= 로 첫 검색어를 받을 수 있다 */
export default function SearchPlaceScreen() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const pick = usePlacePickStore((state) => state.pick);
  const keyboardHeight = useKeyboardHeight();
  const [query, setQuery] = useState(q ?? '');
  const [state, setState] = useState<SearchState>({ status: 'idle' });

  const trimmed = query.trim();

  useEffect(() => {
    if (!trimmed || !hasKakaoKey()) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setState({ status: 'loading' });
      searchKakaoPlaces(trimmed, controller.signal)
        .then((results) => setState({ status: 'done', results }))
        .catch(() => {
          if (!controller.signal.aborted) setState({ status: 'error' });
        });
    }, SEARCH_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  const choose = (place: PlaceInfo) => {
    pick(place);
    router.back();
  };

  let empty: React.ReactNode = null;
  if (!hasKakaoKey()) {
    empty = (
      <EmptyState
        emoji="🔑"
        title="카카오 API 키가 필요해요"
        description={
          '프로젝트의 .env 파일에\nEXPO_PUBLIC_KAKAO_REST_API_KEY를 넣고\n개발 서버를 다시 켜주세요.'
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
        description="인터넷 연결이나 API 키를 확인해주세요."
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
      <View className="px-5 pb-3">
        <TextField
          variant="search"
          value={query}
          onChangeText={setQuery}
          placeholder="가게, 장소 이름"
          autoFocus
          returnKeyType="search"
        />
      </View>
      <FlatList
        data={results}
        keyExtractor={(item) => item.kakaoId}
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
    </SafeAreaView>
  );
}
