import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, NavBar, Text, TextField } from '@/components/atoms';
import { BottomBar } from '@/components/bucket/BottomBar';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { useBucketStore } from '@/store/useBucketStore';
import { useSpaceStore } from '@/store/useSpaceStore';

/** 계정 코드 글자 수 (대시 빼고) */
const CODE_LENGTH = 12;

/** 입력한 글자를 XXXX-XXXX-XXXX 모양으로 */
function formatCode(text: string) {
  const raw = text
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CODE_LENGTH);
  return raw.match(/.{1,4}/g)?.join('-') ?? '';
}

/** 다른 폰에서 쓰던 계정을 계정 코드로 불러오기 */
export default function RestoreAccountScreen() {
  const restoreAccount = useSpaceStore((s) => s.restoreAccount);
  const keyboardHeight = useKeyboardHeight();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = code.replace(/-/g, '').length === CODE_LENGTH;

  const restore = async () => {
    setBusy(true);
    setError(null);
    try {
      await restoreAccount(code);
      // 불러온 계정의 첫 공간으로 (없으면 '나만 보기')
      const first = useSpaceStore.getState().spaces[0];
      await useBucketStore
        .getState()
        .switchSpace(first?.id ?? null)
        .catch(() => {});
      router.dismissAll();
      Alert.alert(
        '계정을 불러왔어요',
        first ? `'${first.name}' 공간으로 돌아왔어요.` : undefined
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : '문제가 생겼어요.');
    } finally {
      setBusy(false);
    }
  };

  const confirm = () =>
    Alert.alert(
      '이 계정으로 바꿀까요?',
      '지금 이 폰의 계정에서 빠져나와요. 지금 계정으로 돌아오려면 지금 계정의 계정 코드가 필요해요.',
      [
        { text: '취소', style: 'cancel' },
        { text: '불러오기', onPress: () => void restore() },
      ]
    );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar title="계정 불러오기" />
      <View className="flex-1" style={{ paddingBottom: keyboardHeight }}>
        <ScrollView
          contentContainerClassName="gap-4 px-5 pb-8 pt-6"
          keyboardShouldPersistTaps="handled"
        >
          <Text weight="700" size={20} className="text-center">
            계정 코드를 넣어주세요
          </Text>
          <Text variant="muted" size={13} className="text-center">
            {'쓰던 폰의 설정 > 내 프로필에서 만든 코드예요'}
          </Text>
          <TextField
            value={code}
            onChangeText={(t) => setCode(formatCode(t))}
            placeholder="XXXX-XXXX-XXXX"
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
            maxLength={CODE_LENGTH + 2}
          />
          {error ? (
            <Text size={13} className="text-destructive">
              {error}
            </Text>
          ) : null}
        </ScrollView>
        <BottomBar>
          <Button
            label={busy ? '불러오는 중…' : '불러오기'}
            disabled={busy || !ready}
            onPress={confirm}
          />
        </BottomBar>
      </View>
    </SafeAreaView>
  );
}
