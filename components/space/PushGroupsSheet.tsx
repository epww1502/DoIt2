import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppSwitch, Text } from '@/components/atoms';
import { SheetPanel } from '@/components/atoms/SheetPanel';
import { PUSH_GROUPS, type PushGroup } from '@/lib/pushPrefs';

type PushGroupsSheetProps = {
  visible: boolean;
  /** 끈 묶음 */
  muted: PushGroup[];
  onChange: (group: PushGroup, on: boolean) => void;
  onClose: () => void;
};

/** 받을 알림 종류를 켜고 끄는 시트 (바꾸는 즉시 저장된다) */
export function PushGroupsSheet({
  visible,
  muted,
  onChange,
  onClose,
}: PushGroupsSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View className="flex-1 justify-end">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="닫기"
          onPress={onClose}
          className="absolute inset-0 bg-black/40"
        />
        <SheetPanel onClose={onClose} handleOnly style={{ maxHeight: '85%' }}>
          <View
            className="shrink rounded-t-3xl bg-background pt-3"
            style={{ paddingBottom: insets.bottom + 12 }}
          >
            <View className="mb-3 h-1 w-10 self-center rounded-full bg-border" />
            <View className="gap-0.5 px-5 pb-3">
              <Text weight="700" size={18}>
                받을 알림
              </Text>
              <Text variant="muted" size={12}>
                끈 알림도 알림센터에는 남아요
              </Text>
            </View>
            <ScrollView contentContainerClassName="gap-4 px-5 pb-2">
              {PUSH_GROUPS.map((g) => (
                <View key={g.key} className="flex-row items-center gap-3">
                  <View className="flex-1 gap-0.5">
                    <Text weight="600" size={15}>
                      {g.label}
                    </Text>
                    <Text variant="muted" size={12}>
                      {g.description}
                    </Text>
                  </View>
                  <AppSwitch
                    accessibilityLabel={`${g.label} 알림`}
                    value={!muted.includes(g.key)}
                    onValueChange={(on) => onChange(g.key, on)}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        </SheetPanel>
      </View>
    </Modal>
  );
}
