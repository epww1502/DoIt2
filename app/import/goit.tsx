import dayjs from 'dayjs';
import { router, useLocalSearchParams } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Badge,
  Button,
  Icon,
  NavBar,
  Text,
  TextField,
} from '@/components/atoms';
import { BottomBar } from '@/components/bucket/BottomBar';
import { FieldLabel } from '@/components/bucket/FieldLabel';
import { SpaceAvatar } from '@/components/space/SpaceAvatar';
import { PERSONAL } from '@/components/space/SpaceSwitcher';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { getCategory } from '@/lib/bucket/types';
import { readCopiedText } from '@/lib/clipboard';
import { showAlert } from '@/lib/dialog';
import { errorMessage, showErrorAlert } from '@/lib/errors';
import {
  addDays,
  parseGoitId,
  stopCategory,
  stopKey,
  tripDates,
  tripToItems,
  type GoitImportMode,
  type GoitTrip,
} from '@/lib/goit';
import { hapticSelect, hapticSuccess } from '@/lib/haptics';
import { GoitNotFoundError, loadGoitTrip } from '@/lib/supabase/goit';
import { cn } from '@/lib/utils';
import { LOCAL_KEY, useBucketStore } from '@/store/useBucketStore';
import { useSpaceStore } from '@/store/useSpaceStore';

/** 고잇투 링크로 앱을 켰으면 돌아갈 화면이 없어서 첫 화면으로 간다 */
function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

const dayLabel = (day: string) => dayjs(day).format('M월 D일 (dd)');

/**
 * 고잇투(여행 일정 짜기)에서 공유한 일정 가져오기: 링크 → 미리보기 → 담을 곳 고르기 → 담기.
 * 고잇투 링크(doit2://import/goit?t=…)로 열리면 바로 불러온다
 */
export default function GoitImportScreen() {
  const params = useLocalSearchParams<{ t?: string }>();
  const fromLink = parseGoitId(
    Array.isArray(params.t) ? params.t[0] : params.t
  );
  const keyboardHeight = useKeyboardHeight();
  const [text, setText] = useState(fromLink ?? '');
  // 링크로 열렸으면 처음부터 불러오는 중
  const [loading, setLoading] = useState(!!fromLink);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<{ id: string; trip: GoitTrip } | null>(
    null
  );
  const pastedId = parseGoitId(text);

  /** 불러오기. 끝나면 결과를 화면에 넣는다 (alive가 false면 화면을 떠난 것) */
  const fetchTrip = (id: string, alive: () => boolean = () => true) =>
    loadGoitTrip(id)
      .then(({ trip }) => {
        if (alive()) setLoaded({ id, trip });
      })
      .catch((e: unknown) => {
        if (!alive()) return;
        setError(
          e instanceof GoitNotFoundError
            ? '만료됐거나 없는 링크예요. 고잇투에서 다시 공유해 주세요.'
            : errorMessage(e)
        );
      })
      .finally(() => {
        if (alive()) setLoading(false);
      });

  const load = (id: string) => {
    setLoading(true);
    setError(null);
    void fetchTrip(id);
  };

  // 링크로 열렸으면 바로, 아니면 복사해 둔 고잇투 링크를 미리 채운다
  useEffect(() => {
    let cancelled = false;
    const alive = () => !cancelled;
    if (fromLink) {
      void fetchTrip(fromLink, alive);
    } else {
      void readCopiedText().then((copied) => {
        if (parseGoitId(copied) && alive()) {
          setText((prev) => prev || copied.trim());
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [fromLink]);

  if (loaded) {
    return (
      <SaveTrip
        id={loaded.id}
        trip={loaded.trip}
        onBack={() => setLoaded(null)}
      />
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar title="고잇투 일정 가져오기" onBack={leave} />
      <View className="flex-1" style={{ paddingBottom: keyboardHeight }}>
        <ScrollView
          contentContainerClassName="gap-4 px-5 pb-8 pt-6"
          keyboardShouldPersistTaps="handled"
        >
          <Text size={48} className="text-center">
            🧳
          </Text>
          <Text weight="700" size={20} className="text-center">
            고잇투 링크 붙여넣기
          </Text>
          <Text variant="muted" size={13} className="text-center">
            고잇투에서 짠 여행 일정을 공유한 링크예요.{'\n'}장소마다, 또는 여행
            하나로 버킷리스트에 담을 수 있어요
          </Text>
          <TextField
            value={text}
            onChangeText={setText}
            placeholder="https://go-it-2.vercel.app/trip/shared?id=…"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          {text.trim() && !pastedId ? (
            <Text variant="muted" size={13}>
              고잇투 공유 링크가 아닌 것 같아요.
            </Text>
          ) : null}
          {error ? (
            <Text size={13} className="text-destructive">
              {error}
            </Text>
          ) : null}
        </ScrollView>
        <BottomBar>
          <Button
            label={loading ? '불러오는 중…' : '불러오기'}
            disabled={loading || !pastedId}
            onPress={() => pastedId && load(pastedId)}
          />
        </BottomBar>
      </View>
    </SafeAreaView>
  );
}

/** 담을 곳: null이면 '나만 보기' */
type Target = string | null;

const MODES: { mode: GoitImportMode; label: string; hint: string }[] = [
  {
    mode: 'each',
    label: '장소마다 담기',
    hint: '고른 장소를 하나씩 담아요. 일정에 날짜가 있으면 그날로 목표 날짜를 잡아요',
  },
  {
    mode: 'trip',
    label: '여행 하나로 담기',
    hint: '여행을 한 항목으로 담고, 장소는 할 것 목록에 넣어요',
  },
];

function SaveTrip({
  id,
  trip,
  onBack,
}: {
  id: string;
  trip: GoitTrip;
  onBack: () => void;
}) {
  const spaces = useSpaceStore((s) => s.spaces);
  const currentId = useBucketStore((s) => s.spaceId);
  const currentItems = useBucketStore((s) => s.items);
  const cache = useBucketStore((s) => s.cache);
  const addItemsTo = useBucketStore((s) => s.addItemsTo);
  const [target, setTarget] = useState<Target>(currentId);
  const [mode, setMode] = useState<GoitImportMode>('each');
  const [saving, setSaving] = useState(false);

  const allKeys = useMemo(
    () => trip.days.flatMap((d, di) => d.stops.map((_, i) => stopKey(di, i))),
    [trip]
  );

  // 그곳에 이미 있는 장소 (카카오 장소 id가 같은 것)
  const existingIn = (where: Target) => {
    const items =
      where === currentId ? currentItems : (cache[where ?? LOCAL_KEY] ?? []);
    const ids = new Set(
      items.map((it) => it.place?.kakaoId).filter((k): k is string => !!k)
    );
    const keys = new Set<string>();
    trip.days.forEach((d, di) =>
      d.stops.forEach((s, i) => {
        if (s.place.kakaoId && ids.has(s.place.kakaoId)) {
          keys.add(stopKey(di, i));
        }
      })
    );
    return keys;
  };
  const existing = existingIn(target);
  const freshSelection = (where: Target) => {
    const skip = existingIn(where);
    return new Set(allKeys.filter((k) => !skip.has(k)));
  };

  const [selected, setSelected] = useState<Set<string>>(() =>
    freshSelection(currentId)
  );
  // 담을 곳을 바꾸면 그곳에 이미 있는 장소는 빼고 다시 고른다
  const pickTarget = (where: Target) => {
    if (where === target) return;
    setTarget(where);
    setSelected(freshSelection(where));
  };

  const targets: {
    id: Target;
    name: string;
    emoji: string;
    image: string | null;
  }[] = [
    { id: null, name: PERSONAL.name, emoji: PERSONAL.emoji, image: null },
    ...spaces.map((s) => ({
      id: s.id,
      name: s.name,
      emoji: s.emoji,
      image: s.image_path,
    })),
  ];
  const targetName = targets.find((t) => t.id === target)?.name ?? '';
  const allSelected = selected.size === allKeys.length;
  const dates = tripDates(trip);
  const start = trip.conditions.startDate;

  const toggle = (key: string) => {
    hapticSelect();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const inputs = tripToItems(trip, mode, { id, selected });
      await addItemsTo(target, inputs);
      hapticSuccess();
      leave();
      const elsewhere = target !== currentId;
      showAlert(
        mode === 'trip'
          ? `'${targetName}'에 '${inputs[0]?.title ?? trip.title}'을(를) 담았어요`
          : `'${targetName}'에 ${inputs.length}개를 담았어요`,
        undefined,
        elsewhere
          ? [
              { text: '닫기', style: 'cancel' },
              {
                text: '보러 가기',
                onPress: () =>
                  void useBucketStore
                    .getState()
                    .switchSpace(target)
                    .catch(() => {}),
              },
            ]
          : undefined
      );
    } catch (e) {
      // 고른 것은 그대로 두고 다시 시도할 수 있게
      showErrorAlert('담지 못했어요', e, save);
    } finally {
      setSaving(false);
    }
  };

  const summary = [
    dates
      ? dates.from === dates.to
        ? dayLabel(dates.from)
        : `${dayLabel(dates.from)} ~ ${dayLabel(dates.to)}`
      : '',
    trip.days.length > 1
      ? `${trip.days.length - 1}박 ${trip.days.length}일`
      : '당일치기',
    `장소 ${allKeys.length}곳`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar
        title="고잇투 일정"
        onBack={onBack}
        right={
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() =>
              setSelected(allSelected ? new Set() : new Set(allKeys))
            }
          >
            <Text weight="600" size={14} className="text-primary">
              {allSelected ? '선택 해제' : '전체 선택'}
            </Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerClassName="gap-6 px-5 pb-8 pt-2">
        <View className="gap-1 rounded-3xl p-5 bg-accent">
          <Text weight="700" size={18}>
            {trip.title}
          </Text>
          <Text variant="muted" size={13}>
            {summary}
          </Text>
        </View>

        <View className="gap-2">
          <FieldLabel>어떻게 담을까요?</FieldLabel>
          {MODES.map((m) => {
            const active = m.mode === mode;
            return (
              <Pressable
                key={m.mode}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  hapticSelect();
                  setMode(m.mode);
                }}
                className={cn(
                  'gap-0.5 rounded-2xl border bg-card p-4 active:opacity-70',
                  active ? 'border-2 border-primary' : 'border-border'
                )}
              >
                <Text weight="600" size={15}>
                  {m.label}
                </Text>
                <Text variant="muted" size={12}>
                  {m.hint}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View>
          <FieldLabel>어디에 담을까요?</FieldLabel>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2"
          >
            {targets.map((t) => {
              const active = t.id === target;
              return (
                <Pressable
                  key={t.id ?? 'local'}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  onPress={() => pickTarget(t.id)}
                  className={cn(
                    'flex-row items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-4 active:opacity-70',
                    active
                      ? 'border-primary bg-primary'
                      : 'border-border bg-background'
                  )}
                >
                  <SpaceAvatar emoji={t.emoji} imagePath={t.image} size={28} />
                  <Text
                    weight="600"
                    size={14}
                    numberOfLines={1}
                    className={
                      active ? 'text-primary-foreground' : 'text-foreground'
                    }
                  >
                    {t.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {trip.days.map((day, di) =>
          day.stops.length === 0 ? null : (
            <View key={di} className="gap-2">
              <FieldLabel>
                {`${di + 1}일차${start ? ` · ${dayLabel(addDays(start, di))}` : ''}`}
              </FieldLabel>
              {day.stops.map((stop, i) => {
                const key = stopKey(di, i);
                const isSelected = selected.has(key);
                const already = existing.has(key);
                const category = getCategory(stopCategory(stop));
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    onPress={() => toggle(key)}
                    className={cn(
                      'flex-row items-center gap-3 rounded-2xl border bg-card p-4',
                      isSelected ? 'border-2 border-primary' : 'border-border'
                    )}
                  >
                    <View className="h-11 w-11 items-center justify-center rounded-full bg-accent">
                      <Text size={20}>{category.emoji}</Text>
                    </View>
                    <View className="flex-1 gap-0.5">
                      <View className="flex-row items-center gap-1.5">
                        <Text
                          weight="600"
                          size={15}
                          numberOfLines={1}
                          className="flex-shrink"
                        >
                          {stop.place.name}
                        </Text>
                        {already ? (
                          <Badge variant="secondary">
                            <Text>이미 있어요</Text>
                          </Badge>
                        ) : null}
                      </View>
                      <Text variant="muted" size={12} numberOfLines={1}>
                        {[category.label, stop.why || stop.place.address]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                    <View
                      className={cn(
                        'h-7 w-7 items-center justify-center rounded-full border-2',
                        isSelected
                          ? 'border-primary bg-primary'
                          : 'border-muted bg-background'
                      )}
                    >
                      {isSelected ? (
                        <Icon
                          as={Check}
                          size={16}
                          className="text-primary-foreground"
                        />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )
        )}
      </ScrollView>
      <BottomBar>
        <Button
          label={
            saving
              ? '담는 중…'
              : selected.size === 0
                ? '담을 장소를 골라주세요'
                : mode === 'trip'
                  ? `'${targetName}'에 여행 하나로 담기`
                  : `'${targetName}'에 ${selected.size}개 담기`
          }
          disabled={saving || selected.size === 0}
          onPress={() => void save()}
        />
      </BottomBar>
    </SafeAreaView>
  );
}
