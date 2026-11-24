import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Chip, NavBar, Text } from '@/components/atoms';
import { BottomBar } from '@/components/bucket/BottomBar';
import { FieldLabel } from '@/components/bucket/FieldLabel';
import { ICON_PREVIEWS } from '@/constants/iconPreviews';
import { PALETTES, type PaletteKey } from '@/constants/palettes';
import {
  applyIconChoice,
  canPickTextColor,
  currentIconChoice,
  DEFAULT_ICON,
  enabledIconCount,
  type IconBackground,
  type IconChoice,
  iconName,
} from '@/lib/appIcon';
import { showAlert } from '@/lib/dialog';
import { hapticSelect } from '@/lib/haptics';
import { trackStep } from '@/lib/steps';

/** 밤색 바탕 (아이콘 그림과 같은 색) */
const NIGHT = '#1F1D2B';

function Swatch({
  color,
  label,
  selected,
  onPress,
}: {
  color: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      hitSlop={4}
      onPress={onPress}
      className={
        selected
          ? 'rounded-full border-2 border-primary p-0.5'
          : 'rounded-full border-2 border-transparent p-0.5'
      }
    >
      <View
        style={{ backgroundColor: color }}
        className="h-9 w-9 rounded-full"
      />
    </Pressable>
  );
}

/**
 * 설정 > 앱 아이콘: 모양(글자/캐릭터) → 바탕 → (글자 + 밤색 바탕이면) 글자색을 골라 홈 화면 아이콘을 바꾼다.
 * 아이콘 모듈이 든 새 빌드에서만 설정에 보인다.
 */
export default function AppIconScreen() {
  const [choice, setChoice] = useState<IconChoice>(DEFAULT_ICON);
  /** 지금 홈 화면에 걸려 있는 아이콘 */
  const [applied, setApplied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** 안드로이드에서 켜져 있는 앱 아이콘 수 (옛 버전에서 늘어났으면 2 이상) */
  const [iconCount, setIconCount] = useState<number | null>(null);
  const duplicated = iconCount !== null && iconCount > 1;

  useEffect(() => {
    let alive = true;
    void enabledIconCount().then((count) => {
      if (alive) setIconCount(count);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    currentIconChoice()
      .then((now) => {
        if (cancelled) return;
        setChoice(now);
        setApplied(iconName(now));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const update = (patch: Partial<IconChoice>) => {
    hapticSelect();
    setChoice((now) => ({ ...now, ...patch }));
  };

  const name = iconName(choice);
  // 아이콘이 여러 개로 늘어나 있으면 같은 아이콘을 다시 골라도 정리된다
  const changed = name !== applied || duplicated;

  const apply = async () => {
    setBusy(true);
    try {
      // 안드로이드는 바꾸면 앱이 닫혀서, 바꾸기 전에 적어 둔다
      trackStep('icon_changed', name ?? 'default');
      await applyIconChoice(choice);
      setApplied(name);
    } catch {
      showAlert('아이콘을 바꾸지 못했어요', '잠시 뒤에 다시 해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const backgrounds: { key: IconBackground; label: string; color: string }[] = [
    ...PALETTES.map((p) => ({ key: p.key, label: p.label, color: p.hex })),
    { key: 'night' as const, label: '밤색', color: NIGHT },
  ];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar title="앱 아이콘" />
      <ScrollView contentContainerClassName="gap-7 px-5 pb-8 pt-2">
        <View className="items-center gap-3 py-2">
          <Image
            source={ICON_PREVIEWS[name ?? 'default']}
            style={{ width: 112, height: 112, borderRadius: 26 }}
            contentFit="cover"
          />
          <Text variant="muted" size={13}>
            홈 화면에 이렇게 보여요
          </Text>
        </View>

        <View>
          <FieldLabel>모양</FieldLabel>
          <View className="flex-row flex-wrap gap-2">
            <Chip
              label="글자"
              selected={choice.style === 'text'}
              onPress={() => update({ style: 'text' })}
            />
            <Chip
              label="캐릭터"
              selected={choice.style === 'char'}
              onPress={() => update({ style: 'char' })}
            />
          </View>
        </View>

        <View>
          <FieldLabel>바탕</FieldLabel>
          <View className="flex-row flex-wrap gap-3">
            {backgrounds.map((bg) => (
              <Swatch
                key={bg.key}
                color={bg.color}
                label={`${bg.label} 바탕`}
                selected={choice.background === bg.key}
                onPress={() =>
                  update({
                    background: bg.key,
                    // 색 바탕을 고르면 글자색은 그 색을 기억해 둔다 (밤색으로 바꿨을 때 이어지게)
                    ...(bg.key === 'night'
                      ? {}
                      : { textColor: bg.key as PaletteKey }),
                  })
                }
              />
            ))}
          </View>
        </View>

        {canPickTextColor(choice) ? (
          <View>
            <FieldLabel>글자색</FieldLabel>
            <View className="flex-row flex-wrap gap-3">
              {PALETTES.map((p) => (
                <Swatch
                  key={p.key}
                  color={p.hex}
                  label={`${p.label} 글자`}
                  selected={choice.textColor === p.key}
                  onPress={() => update({ textColor: p.key })}
                />
              ))}
            </View>
          </View>
        ) : null}

        {duplicated ? (
          <Text size={13} className="text-primary">
            {`지금 홈 화면에 DoIt2가 ${iconCount}개 켜져 있어요. 아무 아이콘이나 한 번 바꾸면(지금 아이콘 그대로도 돼요) 하나만 남아요.`}
          </Text>
        ) : null}
        <Text variant="muted" size={12}>
          {Platform.OS === 'android'
            ? '아이콘을 바꾸면 앱이 한 번 닫혀요. 홈 화면에 반영되기까지 몇 초 걸릴 수 있어요.'
            : '아이콘을 바꾸면 바뀌었다는 안내 창이 한 번 떠요.'}
        </Text>
      </ScrollView>
      <BottomBar>
        <Button
          label={
            busy
              ? '바꾸는 중…'
              : name === applied && duplicated
                ? '이 아이콘 하나만 남기기'
                : changed
                  ? '이 아이콘으로 바꾸기'
                  : '지금 아이콘이에요'
          }
          disabled={busy || !changed}
          onPress={() => void apply()}
        />
      </BottomBar>
    </SafeAreaView>
  );
}
