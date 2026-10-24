import { Check } from 'lucide-react-native';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppSwitch,
  Card,
  CardContent,
  Icon,
  Segmented,
  Separator,
  Text,
} from '@/components/atoms';
import { ScreenHeader } from '@/components/bucket/ScreenHeader';
import { ProfileCard } from '@/components/space/ProfileCard';
import { SpaceStatusCard } from '@/components/space/SpaceStatusCard';
import { PALETTES } from '@/constants/palettes';
import { type ThemeMode, useThemeMode } from '@/contexts/ThemeModeContext';
import { installedVersion } from '@/lib/appVersion';
import { showAlert } from '@/lib/dialog';
import {
  isPushSupported,
  registerForPush,
  unregisterForPush,
} from '@/lib/push';
import { useSettingsStore } from '@/store/useSettingsStore';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: '시스템' },
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
];

export default function SettingsScreen() {
  const { mode, setMode } = useThemeMode();
  const pickAnimation = useSettingsStore((s) => s.pickAnimation);
  const setPickAnimation = useSettingsStore((s) => s.setPickAnimation);
  const haptics = useSettingsStore((s) => s.haptics);
  const setHaptics = useSettingsStore((s) => s.setHaptics);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title="설정" subtitle="공간과 화면을 바꿀 수 있어요" />
      <ScrollView contentContainerClassName="gap-4 px-5 pb-10 pt-3">
        <ProfileCard />
        <SpaceStatusCard />

        <Card className="rounded-2xl">
          <CardContent className="gap-5 p-5">
            <View className="gap-3">
              <Text weight="600" size={16}>
                화면 테마
              </Text>
              <Segmented
                options={THEME_OPTIONS}
                value={mode}
                onChange={setMode}
              />
            </View>
            <View className="gap-3">
              <Text weight="600" size={16}>
                테마색
              </Text>
              <PalettePicker />
            </View>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="gap-4 p-5">
            <ToggleRow
              title="뽑기 애니메이션"
              description="끄면 '오늘 뭐 하지'에서 바로 결과가 나와요"
              value={pickAnimation}
              onChange={setPickAnimation}
            />
            <Separator />
            <ToggleRow
              title="진동"
              description="길게 눌러 고를 때, 뽑기 결과가 나올 때 울려요"
              value={haptics}
              onChange={setHaptics}
            />
            <Separator />
            <PushToggleRow />
          </CardContent>
        </Card>

        <Text variant="muted" size={12} className="mt-4 text-center">
          DoIt2 · 두잇투 v{installedVersion()}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/** 테마색 동그라미 지름과 선택 고리 지름 */
const DOT_SIZE = 34;
const RING_SIZE = 44;

/** 테마색 동그라미들. 누르면 버튼·칩·탭 아이콘 등이 바로 그 색으로 바뀐다 */
function PalettePicker() {
  const palette = useSettingsStore((s) => s.palette);
  const setPalette = useSettingsStore((s) => s.setPalette);

  return (
    <View className="flex-row justify-between">
      {PALETTES.map((p) => {
        const selected = p.key === palette;
        return (
          <Pressable
            key={p.key}
            accessibilityRole="radio"
            accessibilityLabel={`${p.label} 테마색`}
            accessibilityState={{ selected }}
            onPress={() => setPalette(p.key)}
            className="items-center gap-1.5"
          >
            {/* 고른 색은 같은 색 동그란 고리로 감싼다 (라이트·다크 모두 자연스럽게).
                크기·둥글기·테두리를 style로 한 번에 줘서 모양이 네모로 풀리지 않게 한다 */}
            <View
              className="items-center justify-center"
              style={{
                width: RING_SIZE,
                height: RING_SIZE,
                borderRadius: RING_SIZE / 2,
                borderWidth: selected ? 3 : 0,
                borderColor: p.hex,
              }}
            >
              <View
                className="items-center justify-center"
                style={{
                  width: DOT_SIZE,
                  height: DOT_SIZE,
                  borderRadius: DOT_SIZE / 2,
                  backgroundColor: p.hex,
                }}
              >
                {selected ? (
                  <Icon as={Check} size={18} className="text-white" />
                ) : null}
              </View>
            </View>
            <Text
              size={12}
              weight={selected ? '600' : '400'}
              className={selected ? 'text-foreground' : 'text-muted-foreground'}
            >
              {p.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 설정 한 줄: 제목·설명 + 오른쪽 스위치 */
function ToggleRow({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="flex-1 gap-0.5">
        <Text weight="600" size={16}>
          {title}
        </Text>
        <Text variant="muted" size={12}>
          {description}
        </Text>
      </View>
      <AppSwitch
        accessibilityLabel={title}
        value={value}
        onValueChange={onChange}
      />
    </View>
  );
}

/** 알림 켜고 끄기. 알림을 못 받는 앱(Expo Go 등)이면 안내만 */
function PushToggleRow() {
  const pushEnabled = useSettingsStore((s) => s.pushEnabled);
  const setPushEnabled = useSettingsStore((s) => s.setPushEnabled);
  const supported = isPushSupported();

  const change = async (next: boolean) => {
    setPushEnabled(next);
    try {
      if (!next) {
        await unregisterForPush();
        return;
      }
      const ok = await registerForPush();
      if (!ok) {
        setPushEnabled(false);
        showAlert(
          '알림 권한이 꺼져 있어요',
          '휴대폰 설정에서 DoIt2 알림을 허용해주세요.',
          [
            { text: '닫기', style: 'cancel' },
            { text: '설정 열기', onPress: () => void Linking.openSettings() },
          ]
        );
      }
    } catch {
      showAlert('알림 설정을 바꾸지 못했어요', '잠시 후 다시 시도해주세요.');
    }
  };

  return (
    <ToggleRow
      title="알림"
      description={
        supported
          ? '같은 공간 사람이 새로 담거나 기록을 남기면 알려줘요'
          : '이 앱(Expo Go)에서는 알림을 받을 수 없어요'
      }
      value={supported && pushEnabled}
      onChange={(next) => {
        if (supported) void change(next);
      }}
    />
  );
}
