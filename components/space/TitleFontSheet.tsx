import { Check } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text as RNText,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Text } from '@/components/atoms';
import { SheetPanel } from '@/components/atoms/SheetPanel';
import { TITLE_FONTS, type TitleFont } from '@/constants/fonts';
import { loadAllTitleFonts } from '@/hooks/useFontsLoader';
import { cn } from '@/lib/utils';

/** 미리보기 문장 */
const SAMPLE = '오늘 뭐 하지? 버킷리스트 123';

type TitleFontSheetProps = {
  visible: boolean;
  value: TitleFont;
  onSelect: (font: TitleFont) => void;
  onClose: () => void;
};

/** 제목 글씨체 고르기: 글씨체마다 그 글씨로 쓴 미리보기를 보여준다 */
export function TitleFontSheet({
  visible,
  value,
  onSelect,
  onClose,
}: TitleFontSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {visible ? (
        <SheetBody value={value} onSelect={onSelect} onClose={onClose} />
      ) : null}
    </Modal>
  );
}

function SheetBody({
  value,
  onSelect,
  onClose,
}: Omit<TitleFontSheetProps, 'visible'>) {
  const insets = useSafeAreaInsets();
  // 미리보기용으로 글씨체를 모두 불러온다 (앱에 들어 있는 파일이라 금방 끝난다)
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadAllTitleFonts()
      .catch(() => {})
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
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
              글씨체
            </Text>
            <Text variant="muted" size={12}>
              제목·버튼에 쓰는 글씨예요. 본문 글씨는 그대로예요
            </Text>
          </View>
          {ready ? (
            <ScrollView contentContainerClassName="gap-2 px-3 pb-2">
              {(Object.keys(TITLE_FONTS) as TitleFont[]).map((font) => {
                const meta = TITLE_FONTS[font];
                const selected = font === value;
                return (
                  <Pressable
                    key={font}
                    accessibilityRole="button"
                    accessibilityLabel={`${meta.label}, ${meta.hint}`}
                    accessibilityState={{ selected }}
                    onPress={() => {
                      onClose();
                      onSelect(font);
                    }}
                    className={cn(
                      'flex-row items-center gap-3 rounded-2xl border px-4 py-3 active:opacity-70',
                      selected ? 'border-primary' : 'border-border'
                    )}
                  >
                    <View className="flex-1 gap-1">
                      <Text variant="muted" size={12}>
                        {meta.label} · {meta.hint}
                      </Text>
                      <RNText
                        numberOfLines={1}
                        className="text-foreground"
                        style={{ fontFamily: meta.family, fontSize: 20 }}
                      >
                        {SAMPLE}
                      </RNText>
                    </View>
                    {selected ? (
                      <Icon as={Check} size={20} className="text-primary" />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <View className="h-40 items-center justify-center">
              <ActivityIndicator />
            </View>
          )}
        </View>
      </SheetPanel>
    </View>
  );
}
