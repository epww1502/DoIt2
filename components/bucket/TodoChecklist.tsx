import { Check, MapPin, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';

import { Icon, Text } from '@/components/atoms';
import { MAX_TODOS } from '@/components/bucket/TodoListField';
import { colors } from '@/constants/colors';
import { FONT_WEIGHTS } from '@/constants/fonts';
import { showAlert } from '@/lib/dialog';
import { hapticSelect, hapticSuccess } from '@/lib/haptics';
import { MAP_APPS, openInMap, openInSystemMap } from '@/lib/mapLinks';
import {
  itemTodos,
  KIND_META,
  type BucketItem,
  type PlaceInfo,
} from '@/lib/bucket/types';
import { cn } from '@/lib/utils';
import { useBucketStore } from '@/store/useBucketStore';

/**
 * 할 것의 위치를 누르면 지도 앱으로 연다.
 * 안드로이드는 폰의 앱 선택 창이 뜨고, 아이폰은 그런 창이 없어 앱 목록을 보여준다.
 */
function askOpenMap(place: PlaceInfo) {
  if (Platform.OS === 'android') {
    void openInSystemMap(place);
    return;
  }
  showAlert(place.name, place.address, [
    // 버튼이 세로로 쌓이면 거꾸로 그려지므로, 카카오맵이 맨 위에 오게 뒤집어 넘긴다
    ...[...MAP_APPS].reverse().map((app) => ({
      text: `${app.label}에서 보기`,
      onPress: () => void openInMap(app.key, { type: 'place', place }),
    })),
    { text: '닫기', style: 'cancel' as const },
  ]);
}

type TodoChecklistProps = {
  item: BucketItem;
  /** 다 체크했을 때 '기록 남길까요?'에서 '남기기'를 누르면 */
  onRecord: () => void;
};

/**
 * 상세 화면의 '할 것' 카드: 눌러서 하나씩 체크하고, 아래 '+ 할 것 추가'로 바로 더 적는다.
 * 할 것이 없으면 '+ 할 것 추가' 줄만 보인다. 위치를 붙인 할 것은 오른쪽 장소 이름을 누르면 지도 앱으로 연다.
 */
export function TodoChecklist({ item, onRecord }: TodoChecklistProps) {
  const checkTodo = useBucketStore((s) => s.checkTodo);
  const addTodo = useBucketStore((s) => s.addTodo);
  const todos = itemTodos(item);
  const doneCount = todos.filter((t) => t.done).length;
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const toggle = (id: string) => {
    const next = todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    hapticSelect();
    checkTodo(item.id, id, !todos.find((t) => t.id === id)?.done);
    // 마지막 하나까지 체크했고 아직 기록이 없으면, 기록을 남길지 물어본다
    const allDone = next.length > 0 && next.every((t) => t.done);
    const justFinished = allDone && doneCount < todos.length;
    if (justFinished && !item.done) {
      hapticSuccess();
      showAlert(
        '할 것을 다 했어요! 🎉',
        `${KIND_META[item.kind].doneLabel} 기록을 남길까요?`,
        [
          { text: '나중에', style: 'cancel' },
          { text: '기록 남기기', onPress: onRecord },
        ]
      );
    }
  };

  // 이미 기록을 남긴 항목에 할 것도 없으면 카드를 숨긴다
  if (todos.length === 0 && item.done) return null;

  const add = () => {
    const text = draft.trim();
    if (!text) {
      setAdding(false);
      return;
    }
    addTodo(item.id, text);
    setDraft('');
  };

  return (
    <View className="gap-1 rounded-2xl border border-border bg-card p-4">
      <View className="mb-1 flex-row items-center justify-between">
        <Text weight="600" size={13} className="text-muted-foreground">
          할 것
        </Text>
        {todos.length > 0 ? (
          <Text weight="700" size={13} className="text-primary">
            {doneCount}/{todos.length}
          </Text>
        ) : null}
      </View>

      {todos.map((todo) => (
        <Pressable
          key={todo.id}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: todo.done }}
          onPress={() => toggle(todo.id)}
          className="flex-row items-center gap-3 py-2 active:opacity-60"
        >
          <View
            className={cn(
              'h-5 w-5 items-center justify-center rounded-md border-[1.5px]',
              todo.done ? 'border-primary bg-primary' : 'border-primary/50'
            )}
          >
            {todo.done ? (
              <Icon
                as={Check}
                size={14}
                strokeWidth={3}
                className="text-white"
              />
            ) : null}
          </View>
          <Text
            size={15}
            className={cn(
              'flex-1',
              todo.done && 'line-through text-muted-foreground'
            )}
          >
            {todo.text}
          </Text>
          {todo.place ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${todo.place.name} 지도에서 보기`}
              hitSlop={6}
              onPress={() => askOpenMap(todo.place!)}
              className="max-w-[128px] flex-row items-center gap-1 rounded-full px-2.5 py-1 bg-accent active:opacity-60"
            >
              <Icon as={MapPin} size={12} className="text-primary" />
              <Text
                weight="600"
                size={12}
                numberOfLines={1}
                className="shrink text-primary"
              >
                {todo.place.name}
              </Text>
            </Pressable>
          ) : null}
        </Pressable>
      ))}

      {adding ? (
        <View className="flex-row items-center gap-3 py-1.5">
          <View className="h-5 w-5 rounded-md border-[1.5px] border-dashed border-primary/50" />
          <TextInput
            autoFocus
            value={draft}
            onChangeText={setDraft}
            placeholder="할 것을 적고 엔터"
            placeholderTextColor={colors.gray[400]}
            maxLength={60}
            returnKeyType="done"
            // 엔터로 하나 담고 바로 다음 것을 적는다. 비어 있으면 닫는다
            submitBehavior={draft.trim() ? 'submit' : 'blurAndSubmit'}
            onSubmitEditing={add}
            onBlur={() => {
              if (draft.trim()) add();
              setAdding(false);
            }}
            className="flex-1 text-foreground"
            style={{
              fontFamily: FONT_WEIGHTS['400'],
              fontSize: 15,
              paddingVertical: 0,
            }}
          />
        </View>
      ) : todos.length < MAX_TODOS ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setAdding(true)}
          className="flex-row items-center gap-3 py-2 active:opacity-60"
        >
          <Icon as={Plus} size={20} className="text-primary" />
          <Text weight="600" size={14} className="text-primary">
            할 것 추가
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
