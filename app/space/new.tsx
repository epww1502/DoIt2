import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, NavBar, Text, TextField } from '@/components/atoms';
import { BottomBar } from '@/components/bucket/BottomBar';
import { FieldLabel } from '@/components/bucket/FieldLabel';
import { SpaceAvatar } from '@/components/space/SpaceAvatar';
import { SpaceIconPicker } from '@/components/space/SpaceIconPicker';
import { enterSpace, SPACE_EMOJIS } from '@/components/space/spaceFlow';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { deletePhoto } from '@/lib/bucket/photo';
import { useSpaceStore } from '@/store/useSpaceStore';

const NAME_MAX = 20;

/** 새 공간 만들기 → 만들고 나면 초대 화면으로 */
export default function NewSpaceScreen() {
  const { createSpace, updateSpace } = useSpaceStore.getState();
  const keyboardHeight = useKeyboardHeight();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(SPACE_EMOJIS[0]);
  /** 아이콘으로 고른 사진 (휴대폰 파일). 없으면 이모지 */
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chooseEmoji = (e: string) => {
    deletePhoto(imageUri);
    setImageUri(null);
    setEmoji(e);
  };

  const choosePhoto = (uri: string) => {
    deletePhoto(imageUri);
    setImageUri(uri);
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const space = await createSpace(name.trim() || '우리 공간', emoji);
      if (imageUri) {
        // 공간이 생겨야 그 폴더에 사진을 올릴 수 있다
        try {
          await updateSpace(space.id, { imageUri });
        } catch {
          Alert.alert(
            '사진은 올리지 못했어요',
            '공간은 만들어졌어요. 공간 관리에서 사진을 다시 골라주세요.'
          );
        }
      }
      await enterSpace(space.id, space.name);
      router.replace('/space');
    } catch (e) {
      setError(e instanceof Error ? e.message : '문제가 생겼어요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar title="새 공간 만들기" />
      <View className="flex-1" style={{ paddingBottom: keyboardHeight }}>
        <ScrollView
          contentContainerClassName="gap-6 px-5 pb-8 pt-2"
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center gap-2 pt-2">
            <SpaceAvatar emoji={emoji} localUri={imageUri} size={80} />
            <Text variant="muted" className="text-center">
              연인, 친구, 가족 누구와도 함께 쓸 수 있어요.{'\n'}한 공간에 최대
              10명까지 들어올 수 있어요.
            </Text>
          </View>

          <View>
            <FieldLabel>공간 이름</FieldLabel>
            <TextField
              value={name}
              onChangeText={setName}
              placeholder="예) 둘이서, 대학 친구들, 우리 가족"
              maxLength={NAME_MAX}
              autoFocus
            />
          </View>

          <View>
            <FieldLabel>아이콘 (사진 또는 이모지)</FieldLabel>
            <SpaceIconPicker
              emoji={emoji}
              usingPhoto={Boolean(imageUri)}
              onEmoji={chooseEmoji}
              onPhoto={choosePhoto}
            />
          </View>

          {error ? (
            <Text size={13} className="text-destructive">
              {error}
            </Text>
          ) : null}
        </ScrollView>
        <BottomBar>
          <Button
            label={busy ? '만드는 중…' : '만들기'}
            disabled={busy}
            onPress={() => void create()}
          />
        </BottomBar>
      </View>
    </SafeAreaView>
  );
}
