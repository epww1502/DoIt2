import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, NavBar, Text, TextField } from '@/components/atoms';
import { BottomBar } from '@/components/bucket/BottomBar';
import { enterSpace } from '@/components/space/spaceFlow';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { readCopiedText } from '@/lib/clipboard';
import { cleanInviteCode } from '@/lib/inviteLink';
import { inviteCodeFromText } from '@/lib/onboarding';
import { trackStep } from '@/lib/steps';
import { useSettingsStore } from '@/store/useSettingsStore';
import { spacesSettled, useSpaceStore } from '@/store/useSpaceStore';

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

  /** 초대 글이나 초대 페이지에서 복사해 둔 코드를 넣는다 (앱을 새로 깔고 온 사람은 코드를 외우고 있지 않다) */
  const paste = async () => {
    const found = inviteCodeFromText(await readCopiedText());
    if (found) {
      setCode(found);
      setError(null);
    } else {
      setError(
        '복사해 둔 글에서 초대 코드를 찾지 못했어요. 받은 초대 글의 6자리 코드를 넣어주세요.'
      );
    }
  };

  const join = async () => {
    setBusy(true);
    setError(null);
    // 들어가는 순간 '처음 켠 사람' 표시가 꺼지므로 그 전에 읽어 둔다
    const firstTime = !useSettingsStore.getState().welcomed;
    try {
      // 초대 링크로 앱을 처음 켜면 코드가 채워져 있어 바로 누를 수 있는데, 로그인이 아직 안 끝났을 수 있다
      await spacesSettled();
      if (!useSpaceStore.getState().userId) {
        // 로그인에 실패해 있었으면 한 번 더 해 본다
        await useSpaceStore.getState().init();
      }
      if (!useSpaceStore.getState().userId) {
        throw new Error(
          '서버에 연결하지 못했어요. 인터넷을 확인하고 다시 눌러주세요.'
        );
      }
      const space = await joinSpace(code);
      trackStep('joined', firstTime ? 'new' : 'existing');
      await enterSpace(space.id, space.name);
      // 초대 링크로 앱을 처음 켠 사람: 돌아갈 시작 화면이 없으니 들어온 사람의 첫 화면으로 보낸다
      // (시작 화면에서 '초대를 받았어요'로 온 사람은 뒤로 가면 그 화면이 이어서 보여준다)
      if (firstTime && !router.canGoBack()) {
        router.replace({ pathname: '/welcome', params: { joined: '1' } });
      } else {
        leave();
      }
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
          {code.length !== CODE_LENGTH ? (
            <Button
              label="복사한 초대 코드 붙여넣기"
              variant="outline"
              size="md"
              onPress={() => void paste()}
            />
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
