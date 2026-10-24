import { useState } from 'react';
import { Alert, ScrollView, Share, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, NavBar, Text, TextField } from '@/components/atoms';
import { BottomBar } from '@/components/bucket/BottomBar';
import { FieldLabel } from '@/components/bucket/FieldLabel';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { useCoupleStore } from '@/store/useCoupleStore';

const CODE_LENGTH = 6;

/** 커플 연결: 방 만들기(초대 코드 보내기) / 초대 코드로 들어가기 / 연결 끊기 */
export default function CoupleScreen() {
  const status = useCoupleStore((s) => s.status);
  const couple = useCoupleStore((s) => s.couple);
  const memberCount = useCoupleStore((s) => s.memberCount);
  const { init, createCouple, joinCouple, leaveCouple } =
    useCoupleStore.getState();
  const keyboardHeight = useKeyboardHeight();

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(e instanceof Error ? e.message : '문제가 생겼어요.');
    } finally {
      setBusy(false);
    }
  };

  const shareCode = (inviteCode: string) =>
    Share.share({
      message: `DoIt2에서 우리 버킷리스트 같이 쓰자 💕\n초대 코드: ${inviteCode}`,
    });

  const confirmLeave = () =>
    Alert.alert(
      '커플 연결을 끊을까요?',
      '이 휴대폰에는 지금까지의 버킷리스트가 남아요. 둘 다 끊으면 서버의 데이터는 지워져요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '연결 끊기',
          style: 'destructive',
          onPress: () => void run(leaveCouple),
        },
      ]
    );

  let content: React.ReactNode;
  let bottom: React.ReactNode = null;

  if (status === 'unconfigured' || status === 'error') {
    content = (
      <View className="gap-2">
        <Text weight="700" size={22}>
          서버에 연결하지 못했어요
        </Text>
        <Text variant="muted">
          {status === 'unconfigured'
            ? '.env에 Supabase 주소와 키가 없어요.'
            : '인터넷 연결을 확인해주세요. 계속 안 되면 Supabase에서 익명 로그인이 켜져 있는지 확인해주세요.'}
        </Text>
      </View>
    );
    if (status === 'error') {
      bottom = (
        <Button
          label="다시 시도"
          disabled={busy}
          onPress={() => void run(init)}
        />
      );
    }
  } else if (status === 'loading') {
    content = <Text variant="muted">연결 상태를 확인하고 있어요…</Text>;
  } else if (couple && memberCount >= 2) {
    content = (
      <View className="items-center gap-3 pt-10">
        <Text size={56}>💑</Text>
        <Text weight="700" size={22}>
          연결 완료!
        </Text>
        <Text variant="muted" className="text-center">
          이제 둘이 담고 기록한 게{'\n'}서로의 휴대폰에 바로 보여요.
        </Text>
      </View>
    );
    bottom = (
      <Button
        label="연결 끊기"
        variant="ghost"
        disabled={busy}
        onPress={confirmLeave}
      />
    );
  } else if (couple) {
    content = (
      <View className="items-center gap-4 pt-6">
        <Text size={48}>💌</Text>
        <Text weight="700" size={20}>
          상대에게 초대 코드를 보내주세요
        </Text>
        <View className="rounded-2xl px-8 py-5 bg-accent">
          <Text weight="800" size={34} className="tracking-[6px]">
            {couple.invite_code}
          </Text>
        </View>
        <Text variant="muted" className="text-center">
          상대가 DoIt2 설정 → 커플 연결에서{'\n'}이 코드를 넣으면 연결돼요.
        </Text>
      </View>
    );
    bottom = (
      <>
        <Button
          label="초대 코드 보내기"
          onPress={() => void shareCode(couple.invite_code)}
        />
        <Button
          label="방 지우고 다른 코드로 연결하기"
          variant="ghost"
          size="md"
          disabled={busy}
          onPress={() => void run(leaveCouple)}
        />
      </>
    );
  } else {
    content = (
      <View className="gap-8">
        <View className="gap-2">
          <Text weight="700" size={22}>
            둘이 같이 쓰려면 연결해요
          </Text>
          <Text variant="muted">
            한 명이 방을 만들고 초대 코드를 보내면, 상대가 그 코드로 들어와요.
            지금까지 이 휴대폰에 담은 것도 같이 옮겨져요.
          </Text>
        </View>

        <Button
          label="커플 방 만들기"
          disabled={busy}
          onPress={() => void run(createCouple)}
        />

        <View>
          <FieldLabel>초대 코드를 받았어요</FieldLabel>
          <TextField
            value={code}
            onChangeText={(t) =>
              setCode(t.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())
            }
            placeholder="6자리 코드"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={CODE_LENGTH}
          />
          <Button
            label="코드로 연결하기"
            variant="outline"
            className="mt-3"
            disabled={busy || code.length !== CODE_LENGTH}
            onPress={() => void run(() => joinCouple(code))}
          />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar title="커플 연결" />
      <View className="flex-1" style={{ paddingBottom: keyboardHeight }}>
        <ScrollView
          contentContainerClassName="gap-4 px-5 pb-8 pt-2"
          keyboardShouldPersistTaps="handled"
        >
          {content}
          {error ? (
            <Text size={13} className="text-destructive">
              {error}
            </Text>
          ) : null}
        </ScrollView>
        {bottom ? <BottomBar>{bottom}</BottomBar> : null}
      </View>
    </SafeAreaView>
  );
}
