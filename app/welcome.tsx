import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Chip, Text } from '@/components/atoms';
import { BottomBar } from '@/components/bucket/BottomBar';
import { SpaceAvatar } from '@/components/space/SpaceAvatar';
import { draftToInput } from '@/lib/bucket/aiDraft';
import { hapticSelect, hapticSuccess } from '@/lib/haptics';
import { inviteMessage } from '@/lib/inviteLink';
import {
  STARTERS,
  WHO_OPTIONS,
  type WhoKey,
  type WhoOption,
} from '@/lib/onboarding';
import type { SpaceRow } from '@/lib/supabase/database.types';
import { useBucketStore } from '@/store/useBucketStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useSpaceStore } from '@/store/useSpaceStore';

type Step = 'who' | 'pick' | 'invite';

/** 지금 몇 번째인지 보여주는 점 (혼자 쓰면 초대 단계가 없어서 두 개) */
function StepDots({ steps, current }: { steps: Step[]; current: Step }) {
  return (
    <View className="flex-row justify-center gap-1.5 pt-4">
      {steps.map((step) => (
        <View
          key={step}
          className={
            step === current
              ? 'h-1.5 w-6 rounded-full bg-primary'
              : 'h-1.5 w-1.5 rounded-full bg-border'
          }
        />
      ))}
    </View>
  );
}

function Heading({ title, detail }: { title: string; detail: string }) {
  return (
    <View className="gap-2">
      <Text weight="700" size={24}>
        {title}
      </Text>
      <Text variant="muted">{detail}</Text>
    </View>
  );
}

function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      className="active:opacity-60"
    >
      <Text weight="600" size={14} className="text-center text-primary">
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * 처음 켰을 때의 시작 화면. 설명을 넘겨 보게 하는 대신, 물어보면서 실제로 만들어 준다:
 * 누구와 쓸지 → 해보고 싶은 것 고르기 → (함께 쓰면) 초대하기.
 * '공간'이라는 말은 쓰지 않는다. 함께 쓰는 선택지를 고르면 공간을 대신 만들어 준다.
 * 처음 켠 사람만 WelcomeGate가 여기로 보낸다.
 */
export default function WelcomeScreen() {
  const [step, setStep] = useState<Step>('who');
  const [who, setWho] = useState<WhoOption | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  /** 만들어 준 공간 (초대 단계에서 쓴다) */
  const [space, setSpace] = useState<SpaceRow | null>(null);
  /** 초대 글을 한 번이라도 보냈는지 */
  const [invited, setInvited] = useState(false);
  /** 함께 쓰려 했지만 서버에 연결하지 못해 이 폰에만 담았는지 */
  const [offline, setOffline] = useState(false);

  const finish = () => {
    useSettingsStore.getState().setWelcomed(true);
    router.replace('/');
  };

  // 여기서 '초대받았어요'나 '쓰던 계정 불러오기'로 갔다가 공간이 생겨서 돌아왔으면 더 물어볼 게 없다
  const spaceCount = useSpaceStore((s) => s.spaces.length);
  const madeHere = useRef(false);
  useEffect(() => {
    if (spaceCount > 0 && !madeHere.current) finish();
  }, [spaceCount]);

  const together = who !== null && who.key !== 'solo';
  const steps: Step[] =
    together || who === null ? ['who', 'pick', 'invite'] : ['who', 'pick'];

  const choose = (option: WhoOption) => {
    hapticSelect();
    setWho(option);
    setPicked([]);
    setStep('pick');
  };

  const toggle = (title: string) => {
    hapticSelect();
    setPicked((list) =>
      list.includes(title) ? list.filter((t) => t !== title) : [...list, title]
    );
  };

  /** 고른 것을 담는다. 함께 쓰면 공간을 먼저 만들고 그 안에 담는다 */
  const start = async () => {
    if (!who) return;
    setBusy(true);
    const inputs = STARTERS[who.key]
      .filter((starter) => picked.includes(starter.title))
      .map(draftToInput);
    let created: SpaceRow | null = null;
    if (together) {
      try {
        madeHere.current = true;
        created = await useSpaceStore
          .getState()
          .createSpace(who.spaceName, who.spaceEmoji, false);
        await useBucketStore.getState().switchSpace(created.id);
      } catch {
        // 서버에 연결하지 못했다. 이 폰에 먼저 담아 두고, 나중에 함께 쓰기로 바꿀 수 있다
        created = null;
        madeHere.current = false;
        setOffline(true);
      }
    }
    if (inputs.length > 0) useBucketStore.getState().addItems(inputs);
    hapticSuccess();
    setBusy(false);
    if (created) {
      setSpace(created);
      setStep('invite');
    } else if (together) {
      // 초대는 못 하지만 왜 그런지는 알려준다
      setStep('invite');
    } else {
      finish();
    }
  };

  const invite = async () => {
    if (!space) return;
    await Share.share({ message: inviteMessage(space) }).catch(() => {});
    setInvited(true);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <StepDots steps={steps} current={step} />

      {step === 'who' ? (
        <ScrollView contentContainerClassName="gap-6 px-5 pb-10 pt-8">
          <Heading
            title="누구와 같이 쓸까요?"
            detail={
              '가고 싶은 곳과 해보고 싶은 것을 모으고,\n다녀온 뒤 사진과 후기를 남기는 앱이에요.'
            }
          />
          <View className="gap-3">
            {WHO_OPTIONS.map((option) => (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                onPress={() => choose(option)}
                className="flex-row items-center gap-4 rounded-2xl border border-border bg-card px-4 py-4 active:opacity-70"
              >
                <Text size={32}>{option.emoji}</Text>
                <View className="flex-1 gap-0.5">
                  <Text weight="700" size={17}>
                    {option.label}
                  </Text>
                  <Text size={13} className="text-muted-foreground">
                    {option.detail}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
          <View className="gap-4 pt-2">
            <TextLink
              label="초대를 받았어요 (초대 코드 넣기)"
              onPress={() => router.push('/space/join')}
            />
            <TextLink
              label="다른 폰에서 쓰던 계정 불러오기"
              onPress={() => router.push('/account/restore')}
            />
          </View>
        </ScrollView>
      ) : null}

      {step === 'pick' && who ? (
        <View className="flex-1">
          <ScrollView contentContainerClassName="gap-6 px-5 pb-8 pt-8">
            <Heading
              title="해보고 싶은 걸 골라보세요"
              detail="누르면 버킷리스트에 담겨요. 나중에 직접 써서 더 담을 수 있어요."
            />
            <View className="flex-row flex-wrap gap-2">
              {STARTERS[who.key as WhoKey].map((starter) => (
                <Chip
                  key={starter.title}
                  label={starter.title}
                  selected={picked.includes(starter.title)}
                  onPress={() => toggle(starter.title)}
                />
              ))}
            </View>
          </ScrollView>
          <BottomBar>
            <View className="gap-3">
              <Button
                label={
                  busy
                    ? '준비하는 중…'
                    : picked.length > 0
                      ? `${picked.length}개 담고 시작하기`
                      : '나중에 담을게요'
                }
                variant={picked.length > 0 ? undefined : 'outline'}
                disabled={busy}
                onPress={() => void start()}
              />
              <TextLink
                label="이전으로"
                onPress={() => (busy ? undefined : setStep('who'))}
              />
            </View>
          </BottomBar>
        </View>
      ) : null}

      {step === 'invite' && who ? (
        <View className="flex-1">
          <ScrollView contentContainerClassName="items-center gap-5 px-5 pb-8 pt-12">
            {space ? (
              <>
                <SpaceAvatar emoji={space.emoji} size={88} />
                <Text weight="700" size={24} className="text-center">
                  {`'${space.name}' 버킷리스트가 생겼어요`}
                </Text>
                <Text variant="muted" className="text-center">
                  {
                    '이제 같이 쓸 사람을 초대해요.\n링크를 보내면 받은 사람이 눌러서 바로 들어와요.'
                  }
                </Text>
                <Text size={13} className="text-center text-muted-foreground">
                  이름과 아이콘은 나중에 바꿀 수 있어요
                </Text>
              </>
            ) : (
              <>
                <Text size={56}>📱</Text>
                <Text weight="700" size={24} className="text-center">
                  이 휴대폰에 먼저 담았어요
                </Text>
                <Text variant="muted" className="text-center">
                  {offline
                    ? '지금은 서버에 연결하지 못해서 초대는 아직 못 해요.\n인터넷이 되면 오른쪽 위 버튼에서 같이 쓸 사람을 초대할 수 있어요.'
                    : ''}
                </Text>
              </>
            )}
          </ScrollView>
          <BottomBar>
            <View className="gap-3">
              {space && !invited ? (
                <>
                  <Button
                    label="초대 링크 보내기"
                    onPress={() => void invite()}
                  />
                  <TextLink label="나중에 할게요" onPress={finish} />
                </>
              ) : (
                <>
                  <Button label="시작하기" onPress={finish} />
                  {space ? (
                    <TextLink
                      label="초대 링크 다시 보내기"
                      onPress={() => void invite()}
                    />
                  ) : null}
                </>
              )}
            </View>
          </BottomBar>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
