import { router } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Icon, NavBar, Text, TextField } from '@/components/atoms';
import { BottomBar } from '@/components/bucket/BottomBar';
import { FieldLabel } from '@/components/bucket/FieldLabel';
import { SpaceAvatar } from '@/components/space/SpaceAvatar';
import { PERSONAL } from '@/components/space/SpaceSwitcher';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { getCategory } from '@/lib/bucket/types';
import { readCopiedText } from '@/lib/clipboard';
import { showAlert } from '@/lib/dialog';
import { showErrorAlert } from '@/lib/errors';
import { hapticSelect, hapticSuccess } from '@/lib/haptics';
import {
  findShareCode,
  getSharedList,
  SHARE_CODE_LENGTH,
  type SharedList,
} from '@/lib/supabase/share';
import { cn } from '@/lib/utils';
import { useBucketStore } from '@/store/useBucketStore';
import { useSpaceStore } from '@/store/useSpaceStore';
import { ItemIcon } from '@/components/bucket/ItemIcon';

/** 공유받은 목록 가져오기: 코드 → 미리보기 → 담을 곳 고르기 → 새 버킷리스트로 담기 */
export default function SharedListScreen() {
  const keyboardHeight = useKeyboardHeight();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<SharedList | null>(null);

  // 공유 메시지를 복사해 왔으면 코드를 미리 채운다
  useEffect(() => {
    let cancelled = false;
    void readCopiedText().then((text) => {
      const found = findShareCode(text);
      if (found && !cancelled) setCode((prev) => prev || found);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const found = await getSharedList(code);
      if (!found) {
        setError('코드가 맞지 않거나 30일이 지난 공유예요.');
        return;
      }
      setList(found);
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  };

  if (list) return <SaveShared list={list} onBack={() => setList(null)} />;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar title="공유받은 목록 가져오기" />
      <View className="flex-1" style={{ paddingBottom: keyboardHeight }}>
        <ScrollView
          contentContainerClassName="gap-4 px-5 pb-8 pt-6"
          keyboardShouldPersistTaps="handled"
        >
          <Text weight="700" size={20} className="text-center">
            받은 공유 코드를 넣어주세요
          </Text>
          <Text variant="muted" size={13} className="text-center">
            카카오톡 등으로 받은 메시지의 &apos;공유 코드&apos; 6자리예요
          </Text>
          <TextField
            value={code}
            onChangeText={(t) =>
              setCode(t.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())
            }
            placeholder="6자리 코드"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={SHARE_CODE_LENGTH}
          />
          {error ? (
            <Text size={13} className="text-destructive">
              {error}
            </Text>
          ) : null}
        </ScrollView>
        <BottomBar>
          <Button
            label={loading ? '불러오는 중…' : '불러오기'}
            disabled={loading || code.length !== SHARE_CODE_LENGTH}
            onPress={() => void load()}
          />
        </BottomBar>
      </View>
    </SafeAreaView>
  );
}

/** 담을 곳: null이면 '나만 보기' */
type Target = string | null;

function SaveShared({
  list,
  onBack,
}: {
  list: SharedList;
  onBack: () => void;
}) {
  const spaces = useSpaceStore((s) => s.spaces);
  const currentId = useBucketStore((s) => s.spaceId);
  const addItemsTo = useBucketStore((s) => s.addItemsTo);
  const [target, setTarget] = useState<Target>(currentId);
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(list.items.map((_, i) => i))
  );
  const [saving, setSaving] = useState(false);

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
  const allSelected = selected.size === list.items.length;

  const toggle = (i: number) => {
    hapticSelect();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const picked = list.items.filter((_, i) => selected.has(i));
      await addItemsTo(target, picked);
      hapticSuccess();
      router.back();
      const elsewhere = target !== currentId;
      showAlert(
        `'${targetName}'에 ${picked.length}개를 담았어요`,
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

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar
        title="공유받은 목록"
        onBack={onBack}
        right={
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() =>
              setSelected(
                allSelected ? new Set() : new Set(list.items.map((_, i) => i))
              )
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
            {list.title}
          </Text>
          <Text variant="muted" size={13}>
            {`${list.sender ? `${list.sender}님이 보낸 ` : ''}${list.items.length}개`}
          </Text>
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
                  onPress={() => setTarget(t.id)}
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

        <View className="gap-2">
          <FieldLabel>{`담을 항목 (${selected.size}/${list.items.length})`}</FieldLabel>
          {list.items.map((it, i) => {
            const isSelected = selected.has(i);
            const category = getCategory(it.category);
            return (
              <Pressable
                key={`${i}-${it.title}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                onPress={() => toggle(i)}
                className={cn(
                  'flex-row items-center gap-3 rounded-2xl border bg-card p-4',
                  isSelected ? 'border-2 border-primary' : 'border-border'
                )}
              >
                <ItemIcon item={it} size={44} iconSize={20} bare />
                <View className="flex-1 gap-0.5">
                  <Text weight="600" size={15} numberOfLines={1}>
                    {it.title}
                  </Text>
                  <Text variant="muted" size={12} numberOfLines={1}>
                    {[category.label, it.place?.name ?? it.location]
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
      </ScrollView>
      <BottomBar>
        <Button
          label={
            saving
              ? '담는 중…'
              : selected.size > 0
                ? `'${targetName}'에 ${selected.size}개 담기`
                : '담을 걸 골라주세요'
          }
          disabled={saving || selected.size === 0}
          onPress={() => void save()}
        />
      </BottomBar>
    </SafeAreaView>
  );
}
