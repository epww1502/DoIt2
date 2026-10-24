import { Modal, Pressable, View } from 'react-native';

import { type DialogButton, useDialogStore } from '@/lib/dialog';
import { cn } from '@/lib/utils';

import { Text } from './Text';

/**
 * showAlert로 띄운 팝업을 그린다. 루트 레이아웃에 한 번만 둔다.
 * 버튼이 2개면 나란히(취소는 왼쪽 회색), 3개 이상이면 위아래로 쌓는다.
 */
export function DialogHost() {
  const current = useDialogStore((s) => s.queue[0]);
  const shift = useDialogStore((s) => s.shift);

  const press = (button: DialogButton) => {
    shift();
    void button.onPress?.();
  };

  const dismiss = () => {
    if (!current?.cancelable) return;
    const cancel = current.buttons.find((b) => b.style === 'cancel');
    shift();
    void cancel?.onPress?.();
  };

  // 취소 버튼은 늘 왼쪽(또는 맨 아래)에 둔다
  const buttons = current
    ? [
        ...current.buttons.filter((b) => b.style === 'cancel'),
        ...current.buttons.filter((b) => b.style !== 'cancel'),
      ]
    : [];
  const stacked = buttons.length > 2;
  const ordered = stacked ? [...buttons].reverse() : buttons;

  return (
    <Modal
      visible={Boolean(current)}
      transparent
      animationType="fade"
      onRequestClose={dismiss}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View className="flex-1 items-center justify-center px-8">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="닫기"
          onPress={dismiss}
          className="absolute inset-0 bg-black/40"
        />
        {current ? (
          <View
            key={current.id}
            className="w-full max-w-[340px] gap-5 rounded-3xl p-6 bg-background"
          >
            <View className="gap-2">
              <Text weight="700" size={18} className="text-center">
                {current.title}
              </Text>
              {current.message ? (
                <Text variant="muted" size={14} className="text-center">
                  {current.message}
                </Text>
              ) : null}
            </View>
            <View className={cn('gap-2', !stacked && 'flex-row')}>
              {ordered.map((button) => (
                <DialogAction
                  key={button.text}
                  button={button}
                  grow={!stacked}
                  onPress={() => press(button)}
                />
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function DialogAction({
  button,
  grow,
  onPress,
}: {
  button: DialogButton;
  grow: boolean;
  onPress: () => void;
}) {
  const style = button.style ?? 'default';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        'h-12 items-center justify-center rounded-xl px-4 active:opacity-70',
        grow && 'flex-1',
        style === 'cancel' && 'bg-accent',
        style === 'destructive' && 'bg-destructive',
        style === 'default' && 'bg-primary'
      )}
    >
      <Text
        weight="600"
        size={15}
        className={cn(
          style === 'cancel' && 'text-muted-foreground',
          style === 'destructive' && 'text-white',
          style === 'default' && 'text-primary-foreground'
        )}
      >
        {button.text}
      </Text>
    </Pressable>
  );
}
