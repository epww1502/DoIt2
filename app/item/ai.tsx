import { router, useLocalSearchParams } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ErrorState, Icon, NavBar, Text } from '@/components/atoms';
import { TextArea } from '@/components/atoms/TextArea';
import { BottomBar } from '@/components/bucket/BottomBar';
import { EmptyState } from '@/components/bucket/EmptyState';
import { ItemIcon } from '@/components/bucket/ItemIcon';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { useTogether } from '@/hooks/useTogether';
import { parseItems, suggestItems } from '@/lib/ai';
import { ensureAiConsent } from '@/lib/aiConsent';
import { draftToInput, type AiDraft } from '@/lib/bucket/aiDraft';
import { getCategory, KIND_META } from '@/lib/bucket/types';
import { showAlert } from '@/lib/dialog';
import { errorMessage } from '@/lib/errors';
import { hapticSelect, hapticSuccess } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useBucketStore } from '@/store/useBucketStore';

const MAX_TEXT = 500;
/** 추천할 때 AI에게 보여줄 담아 둔 항목 수 (최근 것부터) */
const MAX_KNOWN = 60;

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; drafts: AiDraft[] };

/**
 * AI로 담기. ?mode=suggest 면 담아 둔 것과 어울리는 새 항목을 추천받고,
 * 아니면 말하듯 쓴 글을 항목 여러 개로 나눈다. 둘 다 결과에서 담을 것을 골라 한 번에 담는다.
 */
export default function AiAddScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const suggest = mode === 'suggest';
  const together = useTogether();
  const keyboardHeight = useKeyboardHeight();
  const addItems = useBucketStore((s) => s.addItems);

  const [text, setText] = useState('');
  const [state, setState] = useState<State>({
    status: suggest ? 'loading' : 'idle',
  });
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  /** 이번 화면에서 이미 보여준 추천 (다시 추천받을 때 겹치지 않게) */
  const [shown, setShown] = useState<string[]>([]);

  /** 동의하지 않았으면 null */
  const fetchDrafts = async () => {
    if (!(await ensureAiConsent())) return null;
    const known = useBucketStore
      .getState()
      .items.map((it) => it.title)
      .slice(0, MAX_KNOWN);
    return suggest
      ? suggestItems([...shown, ...known], together)
      : parseItems(text.trim(), known);
  };
  const showDrafts = (drafts: AiDraft[] | null) => {
    if (!drafts) {
      // 동의하지 않았으면: 추천은 화면을 닫고, 글로 담기는 쓰던 글로 돌아간다
      if (suggest) router.back();
      else setState({ status: 'idle' });
      return;
    }
    setState({ status: 'ready', drafts });
    setSelected(new Set(drafts.map((d) => d.title)));
    setShown((prev) => [...prev, ...drafts.map((d) => d.title)]);
  };
  const showError = (e: unknown) =>
    setState({ status: 'error', message: errorMessage(e) });

  const load = () => {
    setState({ status: 'loading' });
    fetchDrafts().then(showDrafts).catch(showError);
  };

  // 추천은 화면을 열자마자 받는다 (처음 상태가 이미 '받는 중'이다)
  useEffect(() => {
    if (suggest) fetchDrafts().then(showDrafts).catch(showError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (title: string) => {
    hapticSelect();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const drafts = state.status === 'ready' ? state.drafts : [];

  // 빠르게 두 번 눌러도 한 번만 담는다
  const added = useRef(false);
  const addSelected = () => {
    if (added.current) return;
    added.current = true;
    const picked = drafts.filter((d) => selected.has(d.title));
    addItems(picked.map(draftToInput));
    hapticSuccess();
    router.back();
    showAlert(`${picked.length}개를 담았어요`);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar
        title={suggest ? 'AI 추천 받기' : '말하듯 써서 여러 개 담기'}
        right={
          state.status === 'ready' ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => (suggest ? load() : setState({ status: 'idle' }))}
            >
              <Text weight="600" size={14} className="text-primary">
                {suggest ? '다른 추천' : '다시 쓰기'}
              </Text>
            </Pressable>
          ) : null
        }
      />
      <View className="flex-1" style={{ paddingBottom: keyboardHeight }}>
        {state.status === 'idle' ? (
          <>
            <ScrollView
              contentContainerClassName="gap-3 px-5 pb-8 pt-2"
              keyboardShouldPersistTaps="handled"
            >
              <Text variant="muted" size={13}>
                하고 싶은 걸 생각나는 대로 써 주세요. AI가 하나씩 나눠 드려요.
              </Text>
              <TextArea
                value={text}
                onChangeText={setText}
                placeholder="예) 다음 달에 부산 가서 회 먹고 요트 타고, 오는 길에 경주도 들르자"
                maxLength={MAX_TEXT}
                autoFocus
                className="min-h-[140px]"
              />
            </ScrollView>
            <BottomBar>
              <Button
                label="나누기"
                disabled={text.trim().length === 0}
                onPress={() => load()}
              />
            </BottomBar>
          </>
        ) : state.status === 'loading' ? (
          <View className="items-center gap-3 py-10">
            <ActivityIndicator />
            <Text variant="muted">
              {suggest ? '어울리는 걸 찾고 있어요' : '하나씩 나누고 있어요'}
            </Text>
          </View>
        ) : state.status === 'error' ? (
          <ErrorState
            title={suggest ? '추천을 받지 못했어요' : '나누지 못했어요'}
            description={state.message}
            onRetry={() => load()}
          />
        ) : drafts.length === 0 ? (
          <EmptyState
            title={
              suggest ? '추천할 걸 찾지 못했어요' : '담을 걸 찾지 못했어요'
            }
            description={
              suggest
                ? '잠시 후 다시 받아 보세요.'
                : '이미 담아 둔 것만 있거나, 하고 싶은 걸 찾지 못했어요.'
            }
          />
        ) : (
          <>
            <ScrollView contentContainerClassName="gap-2 px-5 pb-8 pt-1">
              {drafts.map((draft) => {
                const isSelected = selected.has(draft.title);
                return (
                  <Pressable
                    key={draft.title}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    onPress={() => toggle(draft.title)}
                    className={cn(
                      'flex-row items-center gap-3 rounded-2xl border bg-card p-4',
                      isSelected ? 'border-2 border-primary' : 'border-border'
                    )}
                  >
                    <ItemIcon item={draft} size={44} iconSize={20} />
                    <View className="flex-1 gap-0.5">
                      <Text weight="600" size={15} numberOfLines={2}>
                        {draft.title}
                      </Text>
                      <Text variant="muted" size={12} numberOfLines={1}>
                        {KIND_META[draft.kind].label} ·{' '}
                        {getCategory(draft.category).label}
                      </Text>
                    </View>
                    <View
                      className={cn(
                        'h-7 w-7 items-center justify-center rounded-full border-2',
                        isSelected
                          ? 'border-primary bg-primary'
                          : 'border-muted bg-background'
                      )}
                    >
                      {isSelected ? (
                        <Icon
                          as={Check}
                          size={16}
                          className="text-primary-foreground"
                        />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
            <BottomBar>
              <Button
                label={
                  selected.size > 0
                    ? `${selected.size}개 담기`
                    : '담을 걸 골라주세요'
                }
                disabled={selected.size === 0}
                onPress={addSelected}
              />
            </BottomBar>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
