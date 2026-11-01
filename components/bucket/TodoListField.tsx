import {
  ChevronDown,
  ChevronUp,
  MapPin,
  MapPinPlus,
  Plus,
  X,
} from 'lucide-react-native';
import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Icon, Text } from '@/components/atoms';
import { FieldLabel } from '@/components/bucket/FieldLabel';
import { colors } from '@/constants/colors';
import { FONT_WEIGHTS } from '@/constants/fonts';
import { showAlert } from '@/lib/dialog';
import { newTodoId, type ItemTodo } from '@/lib/bucket/types';
import { cn } from '@/lib/utils';

/** 한 항목에 담을 수 있는 할 것 수 */
export const MAX_TODOS = 30;

type TodoListFieldProps = {
  todos: ItemTodo[];
  onChange: (todos: ItemTodo[]) => void;
  /** 입력칸을 누르면 키보드에 가리지 않게 스크롤 */
  onFocus?: () => void;
  /** 줄의 핀을 누르면: 이 할 것에 붙일 장소를 검색하러 간다 */
  onPickPlace?: (todo: ItemTodo) => void;
};

/**
 * 담기·수정 화면의 '할 것' 칸.
 * 한 줄 쓰고 엔터를 누르거나 아래 '+ 할 것 추가'를 누르면 새 줄이 생기고 바로 입력할 수 있다.
 * 빈 줄은 저장할 때 빠진다. 줄마다 핀을 눌러 위치(장소)를 붙일 수 있다.
 * '순서 바꾸기'를 누르면 줄마다 위·아래 화살표로 순서를 바꾼다 (코스 지도의 번호 순서).
 */
export function TodoListField({
  todos,
  onChange,
  onFocus,
  onPickPlace,
}: TodoListFieldProps) {
  const inputs = useRef(new Map<string, ComponentRef<typeof TextInput>>());
  // 새 줄을 만들면 그 줄이 그려질 때 커서를 옮긴다
  const pendingFocus = useRef<string | null>(null);

  const full = todos.length >= MAX_TODOS;
  // 순서 바꾸기 중: 글자는 못 고치고 위·아래 화살표만 보인다
  const [ordering, setOrdering] = useState(false);
  const canOrder = todos.length >= 2;
  const showOrdering = ordering && canOrder;

  /** index 줄을 한 칸 위(-1)·아래(+1)로 옮긴다 */
  const move = (index: number, by: -1 | 1) => {
    const to = index + by;
    if (to < 0 || to >= todos.length) return;
    const next = [...todos];
    [next[index], next[to]] = [next[to], next[index]];
    onChange(next);
  };

  /** after 다음 자리에 빈 줄을 넣는다 (없으면 맨 끝) */
  const addAfter = (after?: string) => {
    if (full) return;
    const todo: ItemTodo = { id: newTodoId(), text: '', done: false };
    const at = after ? todos.findIndex((t) => t.id === after) + 1 : 0;
    const next =
      at > 0
        ? [...todos.slice(0, at), todo, ...todos.slice(at)]
        : [...todos, todo];
    onChange(next);
    pendingFocus.current = todo.id;
  };

  const change = (id: string, text: string) =>
    onChange(todos.map((t) => (t.id === id ? { ...t, text } : t)));

  const remove = (id: string) => onChange(todos.filter((t) => t.id !== id));

  const clearPlace = (id: string) =>
    onChange(todos.map((t) => (t.id === id ? { ...t, place: null } : t)));

  /** 핀: 장소가 없으면 바로 검색, 있으면 바꿀지 뺄지 묻는다 */
  const pressPlace = (todo: ItemTodo) => {
    if (!onPickPlace) return;
    if (!todo.place) {
      onPickPlace(todo);
      return;
    }
    // 세로로 쌓인 버튼은 거꾸로 그려진다: '바꾸기'가 위, '빼기'가 아래
    showAlert(todo.place.name, todo.place.address, [
      {
        text: '위치 빼기',
        style: 'destructive',
        onPress: () => clearPlace(todo.id),
      },
      { text: '다른 장소로 바꾸기', onPress: () => onPickPlace(todo) },
      { text: '닫기', style: 'cancel' },
    ]);
  };

  return (
    <View>
      <View className="flex-row items-start justify-between">
        <FieldLabel>할 것 (선택)</FieldLabel>
        {canOrder ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setOrdering((v) => !v)}
            className="active:opacity-60"
          >
            <Text weight="600" size={13} className="text-primary">
              {showOrdering ? '다 바꿨어요' : '순서 바꾸기'}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <View className="gap-1.5">
        {todos.map((todo, index) => (
          <View
            key={todo.id}
            className={cn(
              'h-11 flex-row items-center gap-2.5 rounded-xl pl-3.5 pr-2 bg-accent',
              showOrdering && 'border border-primary/40'
            )}
          >
            <View className="h-[18px] w-[18px] rounded-md border-[1.5px] border-primary/50" />
            <TextInput
              ref={(r) => {
                if (!r) {
                  inputs.current.delete(todo.id);
                  return;
                }
                inputs.current.set(todo.id, r);
                if (pendingFocus.current === todo.id) {
                  pendingFocus.current = null;
                  r.focus();
                }
              }}
              value={todo.text}
              editable={!showOrdering}
              onChangeText={(text) => change(todo.id, text)}
              placeholder="예) 아이파크몰 구경"
              placeholderTextColor={colors.gray[400]}
              maxLength={60}
              returnKeyType="next"
              // 엔터: 글자가 있으면 바로 아래에 새 줄, 비어 있으면 키보드만 내린다
              submitBehavior={todo.text.trim() ? 'submit' : 'blurAndSubmit'}
              onSubmitEditing={() => {
                if (todo.text.trim()) addAfter(todo.id);
              }}
              onFocus={onFocus}
              className="flex-1 text-foreground"
              style={{
                fontFamily: FONT_WEIGHTS['500'],
                fontSize: 15,
                paddingVertical: 0,
              }}
            />
            {showOrdering ? (
              <>
                <OrderButton
                  icon={ChevronUp}
                  label="위로"
                  disabled={index === 0}
                  onPress={() => move(index, -1)}
                />
                <OrderButton
                  icon={ChevronDown}
                  label="아래로"
                  disabled={index === todos.length - 1}
                  onPress={() => move(index, 1)}
                />
              </>
            ) : null}
            {showOrdering ? null : onPickPlace ? (
              todo.place ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`위치: ${todo.place.name}`}
                  hitSlop={6}
                  onPress={() => pressPlace(todo)}
                  className="max-w-[112px] flex-row items-center gap-1 rounded-full bg-card px-2 py-1 active:opacity-60"
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
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="이 할 것에 위치 정하기"
                  hitSlop={6}
                  onPress={() => pressPlace(todo)}
                  className="h-7 w-7 items-center justify-center rounded-full active:opacity-60"
                >
                  <Icon
                    as={MapPinPlus}
                    size={17}
                    className="text-muted-foreground"
                  />
                </Pressable>
              )
            ) : null}
            {showOrdering ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="이 할 것 지우기"
                hitSlop={8}
                onPress={() => remove(todo.id)}
                className="h-7 w-7 items-center justify-center rounded-full active:opacity-60"
              >
                <Icon as={X} size={16} className="text-muted-foreground" />
              </Pressable>
            )}
          </View>
        ))}
        {full || showOrdering ? null : (
          <Pressable
            accessibilityRole="button"
            onPress={() => addAfter()}
            className="h-11 flex-row items-center gap-2 rounded-xl border border-dashed border-primary/50 px-3.5 active:opacity-60"
          >
            <Icon as={Plus} size={18} className="text-primary" />
            <Text weight="600" size={14} className="text-primary">
              할 것 추가
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** 순서 바꾸기 중 줄 오른쪽의 위·아래 화살표 */
function OrderButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: typeof ChevronUp;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      className={cn(
        'h-8 w-8 items-center justify-center rounded-full bg-card active:opacity-60',
        disabled && 'opacity-30'
      )}
    >
      <Icon as={icon} size={18} className="text-primary" />
    </Pressable>
  );
}
