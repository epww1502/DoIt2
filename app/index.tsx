import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
  Text,
} from '@/components/atoms';
import { type ThemeMode, useThemeMode } from '@/contexts/ThemeModeContext';
import { cn } from '@/lib/utils';

const THEME_OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: 'system', label: '시스템' },
  { mode: 'light', label: '라이트' },
  { mode: 'dark', label: '다크' },
];

export default function HomeScreen() {
  const { mode, setMode } = useThemeMode();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="gap-6 p-6">
        <View className="gap-2">
          <Badge className="self-start">
            <Text>Expo SDK 58</Text>
          </Badge>
          <Text variant="display">DoIt2</Text>
          <Text variant="muted">
            둘이 같이 가고 싶은 곳을 모으고, 다녀온 곳을 기록하는 커플
            버킷리스트 앱이에요.
          </Text>
        </View>

        <Card>
          <CardHeader>
            <CardTitle>테마</CardTitle>
            <CardDescription>
              다크 모드 전환이 잘 되는지 확인해요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <View className="flex-row gap-2">
              {THEME_OPTIONS.map((option) => {
                const selected = option.mode === mode;
                return (
                  <Pressable
                    key={option.mode}
                    onPress={() => setMode(option.mode)}
                    className={cn(
                      'rounded-lg border px-4 py-2 border-border',
                      selected && 'bg-primary border-primary'
                    )}
                  >
                    <Text
                      variant="label"
                      className={cn(
                        'text-foreground',
                        selected && 'text-primary-foreground'
                      )}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </CardContent>
        </Card>

        <Separator />

        <View className="gap-1">
          <Text weight="700" size={18}>
            Pretendard Bold
          </Text>
          <Text variant="body">본문 텍스트 · Pretendard Regular</Text>
          <Text variant="caption">캡션 텍스트 · Pretendard Medium</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
