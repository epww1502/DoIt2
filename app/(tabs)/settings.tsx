import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Check, ChevronRight } from 'lucide-react-native';
import {
  DevSettings,
  Linking,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import * as Updates from 'expo-updates';
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
import { InboxCard } from '@/components/space/InboxCard';
import { ProfileCard } from '@/components/space/ProfileCard';
import { SpaceStatusCard } from '@/components/space/SpaceStatusCard';
import { PushGroupsSheet } from '@/components/space/PushGroupsSheet';
import { TitleFontSheet } from '@/components/space/TitleFontSheet';
import { TrashCard } from '@/components/space/TrashCard';
import { TITLE_FONTS, type TitleFont } from '@/constants/fonts';
import { PALETTES } from '@/constants/palettes';
import { type ThemeMode, useThemeMode } from '@/contexts/ThemeModeContext';
import { installedVersion } from '@/lib/appVersion';
import { showAlert } from '@/lib/dialog';
import { showErrorAlert } from '@/lib/errors';
import {
  fetchMutedGroups,
  PUSH_GROUPS,
  saveMutedGroups,
  toggleGroup,
  type PushGroup,
} from '@/lib/pushPrefs';
import { ensureReminderPermission } from '@/lib/reminders';
import {
  isPushSupported,
  registerForPush,
  unregisterForPush,
} from '@/lib/push';
import { useSpaceStore } from '@/store/useSpaceStore';
import { type PickStyle, useSettingsStore } from '@/store/useSettingsStore';
import { useTabBarSpace } from '@/hooks/useTabBarSpace';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: '시스템' },
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
];

const PICK_STYLE_OPTIONS: { value: PickStyle; label: string }[] = [
  { value: 'fan', label: '카드 뽑기' },
  { value: 'slot', label: '슬롯머신' },
  { value: 'none', label: '바로 결과' },
];

export default function SettingsScreen() {
  const { mode, setMode } = useThemeMode();
  const pickStyle = useSettingsStore((s) => s.pickStyle);
  const setPickStyle = useSettingsStore((s) => s.setPickStyle);
  const haptics = useSettingsStore((s) => s.haptics);
  const setHaptics = useSettingsStore((s) => s.setHaptics);
  const tabBarSpace = useTabBarSpace();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScreenHeader title="설정" subtitle="공간과 화면을 바꿀 수 있어요" />
      <ScrollView
        contentContainerClassName="gap-4 px-5 pt-3"
        contentContainerStyle={{ paddingBottom: tabBarSpace + 24 }}
      >
        <InboxCard />
        <ProfileCard />
        <SpaceStatusCard />
        <TrashCard />

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
            <TitleFontPicker />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="gap-4 p-5">
            <View className="gap-3">
              <View className="gap-0.5">
                <Text weight="600" size={16}>
                  뽑기 애니메이션
                </Text>
                <Text variant="muted" size={12}>
                  추천 탭에서 뽑을 때 보여줄 모습이에요
                </Text>
              </View>
              <Segmented
                options={PICK_STYLE_OPTIONS}
                value={pickStyle}
                onChange={setPickStyle}
              />
            </View>
            <Separator />
            <ToggleRow
              title="진동"
              description="길게 눌러 고를 때, 뽑기 결과가 나올 때 울려요"
              value={haptics}
              onChange={setHaptics}
            />
            <Separator />
            <PushToggleRow />
            <PushGroupRows />
            <Separator />
            <WeekendToggleRow />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/ai-usage')}
              className="flex-row items-center gap-3 active:opacity-70"
            >
              <View className="flex-1 gap-0.5">
                <Text weight="600" size={16}>
                  AI 사용량
                </Text>
                <Text variant="muted" size={12}>
                  오늘 AI를 몇 번 더 쓸 수 있는지 봐요
                </Text>
              </View>
              <Icon
                as={ChevronRight}
                size={18}
                className="text-muted-foreground"
              />
            </Pressable>
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
    } catch (e) {
      // 실패했으면 스위치를 원래대로 돌린다 (켜진 것처럼 보이지 않게)
      setPushEnabled(!next);
      showErrorAlert('알림 설정을 바꾸지 못했어요', e, () => change(next));
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

/** 제목·버튼 글씨체 고르기. 켤 때 불러오는 글꼴이라 바꾸면 앱을 다시 불러온다 */
function TitleFontPicker() {
  const titleFont = useSettingsStore((s) => s.titleFont);
  const setTitleFont = useSettingsStore((s) => s.setTitleFont);
  const [sheetOpen, setSheetOpen] = useState(false);

  const choose = (font: TitleFont) => {
    if (font === titleFont) return;
    setTitleFont(font);
    showAlert(
      '글씨체를 바꿀까요?',
      '앱을 다시 불러오면 바뀐 글씨체로 보여요. 나중에 앱을 다시 켤 때 바꿔도 돼요.',
      [
        { text: '나중에', style: 'cancel' },
        {
          text: '다시 불러오기',
          onPress: async () => {
            // 고른 값이 휴대폰에 저장될 시간을 잠깐 준다
            await new Promise((r) => setTimeout(r, 300));
            if (__DEV__) DevSettings.reload();
            else await Updates.reloadAsync();
          },
        },
      ]
    );
  };

  return (
    <>
      {/* 지금 글씨체를 그 글씨로 보여주고, 누르면 미리보기와 함께 고른다 */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`글씨체: ${TITLE_FONTS[titleFont].label}, 바꾸기`}
        onPress={() => setSheetOpen(true)}
        className="flex-row items-center gap-3 active:opacity-70"
      >
        <View className="flex-1 gap-0.5">
          <Text weight="600" size={16}>
            글씨체
          </Text>
          <Text variant="muted" size={12}>
            제목·버튼에 쓰는 글씨예요
          </Text>
        </View>
        <Text weight="600" size={15} className="text-primary">
          {TITLE_FONTS[titleFont].label}
        </Text>
        <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
      </Pressable>
      <TitleFontSheet
        visible={sheetOpen}
        value={titleFont}
        onSelect={choose}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}

/** 알림을 켰을 때: 종류별로 켜고 끄기 (내 프로필에 저장, 폰을 바꿔도 그대로) */
function PushGroupRows() {
  const pushEnabled = useSettingsStore((s) => s.pushEnabled);
  const userId = useSpaceStore((s) => s.userId);
  const show = isPushSupported() && pushEnabled && Boolean(userId);
  const [muted, setMuted] = useState<PushGroup[] | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!show || !userId) return;
    let cancelled = false;
    fetchMutedGroups(userId)
      .then((list) => {
        if (!cancelled) setMuted(list);
      })
      // 못 불러오면 줄을 숨긴다 (모르는 채로 저장하면 서버 값을 덮어쓴다)
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [show, userId]);

  if (!show || !userId || !muted) return null;

  const change = async (group: PushGroup, on: boolean) => {
    const before = muted;
    const next = toggleGroup(muted, group, on);
    setMuted(next);
    try {
      await saveMutedGroups(userId, next);
    } catch (e) {
      setMuted(before);
      showErrorAlert('알림 설정을 바꾸지 못했어요', e, () => change(group, on));
    }
  };

  // 다 켰으면 '전부 받음', 아니면 몇 개 받는지만 (자세한 건 누르면 시트에서)
  const onCount = PUSH_GROUPS.length - muted.length;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`받을 알림 종류, ${PUSH_GROUPS.length}개 중 ${onCount}개 받음, 바꾸기`}
        onPress={() => setSheetOpen(true)}
        className="flex-row items-center gap-3 active:opacity-70"
      >
        <Text weight="600" size={14} className="flex-1">
          받을 알림 종류
        </Text>
        <Text size={14} className="text-muted-foreground">
          {muted.length === 0
            ? '전부 받음'
            : `${PUSH_GROUPS.length}개 중 ${onCount}개`}
        </Text>
        <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
      </Pressable>
      <PushGroupsSheet
        visible={sheetOpen}
        muted={muted}
        onChange={(group, on) => void change(group, on)}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}

/** 금요일 저녁 '이번 주말 뭐 할까?' 알림 켜고 끄기 */
function WeekendToggleRow() {
  const weekend = useSettingsStore((s) => s.weekendReminder);
  const setWeekend = useSettingsStore((s) => s.setWeekendReminder);
  const supported = isPushSupported();

  const change = async (next: boolean) => {
    setWeekend(next);
    if (!next) return;
    const ok = await ensureReminderPermission(true).catch(() => false);
    if (!ok) {
      showAlert(
        '알림 권한이 꺼져 있어요',
        '휴대폰 설정에서 DoIt2 알림을 허용하면 금요일 저녁에 알려드려요.',
        [
          { text: '닫기', style: 'cancel' },
          { text: '설정 열기', onPress: () => void Linking.openSettings() },
        ]
      );
    }
  };

  return (
    <ToggleRow
      title="주말 추천 알림"
      description={
        supported
          ? "금요일 저녁 7시에 '이번 주말 뭐 할까?' 하나 골라 알려줘요"
          : '이 앱(Expo Go)에서는 알림을 받을 수 없어요'
      }
      value={supported && weekend}
      onChange={(next) => {
        if (supported) void change(next);
      }}
    />
  );
}
