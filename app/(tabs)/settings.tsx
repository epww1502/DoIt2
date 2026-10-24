import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, CardContent, Segmented, Text } from '@/components/atoms';
import { ScreenHeader } from '@/components/place/ScreenHeader';
import { type ThemeMode, useThemeMode } from '@/contexts/ThemeModeContext';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: '시스템' },
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
];

export default function SettingsScreen() {
  const { mode, setMode } = useThemeMode();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title="설정" />
      <View className="gap-4 px-5">
        <Card className="rounded-2xl">
          <CardContent className="gap-3 p-5">
            <Text weight="600" size={16}>
              화면 테마
            </Text>
            <Segmented
              options={THEME_OPTIONS}
              value={mode}
              onChange={setMode}
            />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="gap-1 p-5">
            <Text weight="600" size={16}>
              데이터 저장
            </Text>
            <Text variant="muted">
              지금은 이 휴대폰에만 저장돼요. 둘이 같이 보는 기능은 곧
              추가할게요.
            </Text>
          </CardContent>
        </Card>

        <Text variant="muted" size={12} className="mt-4 text-center">
          DoIt2 · 두잇투 v0.1.0
        </Text>
      </View>
    </SafeAreaView>
  );
}
