import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, NavBar, Text, TextField } from '@/components/atoms';
import { BottomBar } from '@/components/bucket/BottomBar';
import { enterSpace } from '@/components/space/spaceFlow';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { useSpaceStore } from '@/store/useSpaceStore';

const CODE_LENGTH = 6;

/** 받은 초대 코드로 공간에 들어가기 */
export default function JoinSpaceScreen() {
  const joinSpace = useSpaceStore((s) => s.joinSpace);
  const keyboardHeight = useKeyboardHeight();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      const space = await joinSpace(code);
      await enterSpace(space.id, space.name);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : '문제가 생겼어요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar title="초대 코드로 들어가기" />
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
            onChangeText={(t) =>
              setCode(t.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())
            }
            placeholder="6자리 코드"
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
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
