import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, NavBar, Text, TextField } from '@/components/atoms';
import { BottomBar } from '@/components/bucket/BottomBar';
import { enterSpace } from '@/components/space/spaceFlow';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { cleanInviteCode } from '@/lib/inviteLink';
import { useSpaceStore } from '@/store/useSpaceStore';

const CODE_LENGTH = 6;

/** 받은 초대 코드로 공간에 들어가기. 초대 링크(doit2://space/join?code=…)로 열리면 코드가 채워져 있다 */
export default function JoinSpaceScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const joinSpace = useSpaceStore((s) => s.joinSpace);
  const keyboardHeight = useKeyboardHeight();
  const [code, setCode] = useState(() => cleanInviteCode(params.code));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 초대 링크로 앱을 켰으면 돌아갈 화면이 없어서 첫 화면으로 간다
  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      const space = await joinSpace(code);
      await enterSpace(space.id, space.name);
      leave();
    } catch (e) {
      setError(e instanceof Error ? e.message : '문제가 생겼어요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar title="초대 코드로 들어가기" onBack={leave} />
      <View className="flex-1" style={{ paddingBottom: keyboardHeight }}>
        <ScrollView
          contentContainerClassName="gap-4 px-5 pb-8 pt-6"
          keyboardShouldPersistTaps="handled"
        >
          <Text size={48} className="text-center">
            🎟️
          </Text>
          <Text weight="700" size={20} className="text-center">
            받은 초대 코드를 넣어주세요
          </Text>
          <TextField
            value={code}
            onChangeText={(t) => setCode(cleanInviteCode(t))}
            placeholder="6자리 코드"
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus={code.length !== CODE_LENGTH}
            maxLength={CODE_LENGTH}
          />
          {error ? (
            <Text size={13} className="text-destructive">
              {error}
            </Text>
          ) : null}
        </ScrollView>
        <BottomBar>
          <Button
            label={busy ? '들어가는 중…' : '들어가기'}
            disabled={busy || code.length !== CODE_LENGTH}
            onPress={() => void join()}
          />
        </BottomBar>
      </View>
    </SafeAreaView>
  );
}
