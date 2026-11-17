import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button, Chip, Text, TextField } from '@/components/atoms';
import { BottomBar } from '@/components/bucket/BottomBar';
import { FieldLabel } from '@/components/bucket/FieldLabel';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { hapticSelect } from '@/lib/haptics';
import {
  GUIDED_TODO_MAX,
  STARTER_TITLE_MAX,
  type GuidedItem,
} from '@/lib/onboarding';
import {
  type BucketKind,
  type BucketSetting,
  CATEGORIES_BY_KIND,
  type CategoryKey,
  KIND_META,
  SETTING_META,
} from '@/lib/bucket/types';

type GuidedAddProps = {
  /** 함께 쓰는지 (묻는 말이 조금 달라진다) */
  together: boolean;
  onDone: (item: GuidedItem) => void;
  onCancel: () => void;
};

/** 지금 몇 번째 칸까지 보여줄지: 종류 → 이름 → 카테고리 → 실내/실외 → 할 것 */
type Stage = 1 | 2 | 3 | 4 | 5;

function StepLabel({ n, children }: { n: number; children: string }) {
  return <FieldLabel>{`${n}. ${children}`}</FieldLabel>;
}

/**
 * 시작 화면의 '직접 해보기'. 담기 화면(app/item/new.tsx)과 같은 순서·같은 말로 묻되,
 * 한 칸을 채우면 다음 칸이 아래에 나타난다. 한 번 따라 해 보면 나중에 담기 화면이 낯설지 않다.
 * 장소·날짜·사진처럼 처음에 없어도 되는 칸은 묻지 않고, 끝에서 어디서 넣는지만 알려준다.
 */
export function GuidedAdd({ together, onDone, onCancel }: GuidedAddProps) {
  const keyboardHeight = useKeyboardHeight();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [stage, setStage] = useState<Stage>(1);
  const [kind, setKind] = useState<BucketKind | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [setting, setSetting] = useState<BucketSetting | null>(null);
  const [todos, setTodos] = useState<string[]>([]);
  const [todoDraft, setTodoDraft] = useState('');

  // 새 칸이 나타나면 그 칸이 보이게 아래로 내린다
  useEffect(() => {
    const timer = setTimeout(
      () => scrollRef.current?.scrollToEnd({ animated: true }),
      80
    );
    return () => clearTimeout(timer);
  }, [stage, todos.length]);

  const reveal = (next: Stage) => setStage((now) => (next > now ? next : now));

  const chooseKind = (next: BucketKind) => {
    hapticSelect();
    // 종류가 바뀌면 고를 수 있는 카테고리가 달라진다
    if (next !== kind) setCategory(null);
    setKind(next);
    reveal(2);
  };

  const chooseCategory = (next: CategoryKey) => {
    hapticSelect();
    setCategory(next);
    reveal(4);
  };

  const chooseSetting = (next: BucketSetting) => {
    hapticSelect();
    setSetting(next);
    reveal(5);
  };

  const addTodo = () => {
    const text = todoDraft.trim();
    if (!text || todos.length >= GUIDED_TODO_MAX) return;
    hapticSelect();
    setTodos((list) => [...list, text]);
    setTodoDraft('');
  };

  const name = title.trim();
  const complete = Boolean(kind && name && category && setting);

  const done = () => {
    if (!kind || !name || !category || !setting) return;
    const typed = todoDraft.trim();
    onDone({
      title: name,
      kind,
      category,
      setting,
      // 쓰다 만 할 것도 담는다
      todos: (typed ? [...todos, typed] : todos).slice(0, GUIDED_TODO_MAX),
    });
  };

  const meta = kind ? KIND_META[kind] : null;

  return (
    <View className="flex-1" style={{ paddingBottom: keyboardHeight }}>
      <ScrollView
        ref={scrollRef}
        contentContainerClassName="gap-7 px-5 pb-8 pt-8"
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-2">
          <Text weight="700" size={24}>
            하나 같이 담아볼까요?
          </Text>
          <Text variant="muted">
            물어보는 대로 고르면 돼요. 나중에 담을 때도 같은 순서예요.
          </Text>
        </View>

        <View>
          <StepLabel n={1}>가고 싶은 곳인가요, 해보고 싶은 일인가요?</StepLabel>
          <View className="flex-row flex-wrap gap-2">
            <Chip
              emoji={KIND_META.place.emoji}
              label={`${KIND_META.place.label} · 가고 싶은 곳`}
              selected={kind === 'place'}
              onPress={() => chooseKind('place')}
            />
            <Chip
              emoji={KIND_META.activity.emoji}
              label={`${KIND_META.activity.label} · 해보고 싶은 일`}
              selected={kind === 'activity'}
              onPress={() => chooseKind('activity')}
            />
          </View>
        </View>

        {stage >= 2 && meta ? (
          <View>
            <StepLabel n={2}>
              {kind === 'activity' && !together
                ? '뭐 해볼까요?'
                : meta.question}
            </StepLabel>
            <View className="flex-row items-center gap-2">
              <TextField
                className="flex-1"
                value={title}
                onChangeText={(next) =>
                  setTitle(next.slice(0, STARTER_TITLE_MAX))
                }
                placeholder={meta.placeholder}
                autoFocus
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => (name ? reveal(3) : undefined)}
              />
              {stage === 2 ? (
                <Button
                  label="다음"
                  size="md"
                  disabled={!name}
                  onPress={() => reveal(3)}
                />
              ) : null}
            </View>
          </View>
        ) : null}

        {stage >= 3 && kind ? (
          <View>
            <StepLabel n={3}>카테고리</StepLabel>
            <View className="flex-row flex-wrap gap-2">
              {CATEGORIES_BY_KIND[kind].map((c) => (
                <Chip
                  key={c.key}
                  category={c.key}
                  label={c.label}
                  selected={category === c.key}
                  onPress={() => chooseCategory(c.key)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {stage >= 4 ? (
          <View>
            <StepLabel n={4}>실내에서 해요, 밖에서 해요?</StepLabel>
            <View className="flex-row flex-wrap gap-2">
              {(['indoor', 'outdoor'] as const).map((value) => (
                <Chip
                  key={value}
                  emoji={SETTING_META[value].emoji}
                  label={SETTING_META[value].label}
                  selected={setting === value}
                  onPress={() => chooseSetting(value)}
                />
              ))}
            </View>
            <Text variant="muted" size={12} className="mt-2">
              비 오는 날에는 &apos;오늘 뭐 하지&apos;에서 실외를 빼고 뽑아요
            </Text>
          </View>
        ) : null}

        {stage >= 5 ? (
          <View>
            <StepLabel n={5}>할 것 (없으면 넘어가도 돼요)</StepLabel>
            {todos.length > 0 ? (
              <View className="mb-2 gap-1.5">
                {todos.map((todo, i) => (
                  <Text key={`${i}-${todo}`} size={15}>
                    {`☐  ${todo}`}
                  </Text>
                ))}
              </View>
            ) : null}
            {todos.length < GUIDED_TODO_MAX ? (
              <View className="flex-row items-center gap-2">
                <TextField
                  className="flex-1"
                  value={todoDraft}
                  onChangeText={(next) => setTodoDraft(next.slice(0, 30))}
                  placeholder="예) 예약하기, 준비물 챙기기"
                  returnKeyType="done"
                  submitBehavior="submit"
                  onSubmitEditing={addTodo}
                />
                <Button
                  label="추가"
                  size="md"
                  variant="outline"
                  disabled={!todoDraft.trim()}
                  onPress={addTodo}
                />
              </View>
            ) : null}
            <Text variant="muted" size={12} className="mt-3">
              장소, 날짜, 사진은 담은 뒤 항목을 열어서 넣을 수 있어요
            </Text>
          </View>
        ) : null}
      </ScrollView>
      <BottomBar>
        <View className="gap-3">
          <Button
            label={complete ? '이대로 담기' : `${stage} / 5`}
            disabled={!complete}
            onPress={done}
          />
          <Button
            label="예시에서 고를게요"
            variant="outline"
            size="md"
            onPress={onCancel}
          />
        </View>
      </BottomBar>
    </View>
  );
}
