import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert } from '@/lib/dialog';
import { Button, NavBar, Segmented, Text, TextField } from '@/components/atoms';
import { BottomBar } from '@/components/bucket/BottomBar';
import { FieldLabel } from '@/components/bucket/FieldLabel';
import { SpaceAvatar } from '@/components/space/SpaceAvatar';
import { SpaceIconPicker } from '@/components/space/SpaceIconPicker';
import { enterSpace, SPACE_EMOJIS } from '@/components/space/spaceFlow';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { deletePhoto } from '@/lib/bucket/photo';
import { useSpaceStore } from '@/store/useSpaceStore';

const NAME_MAX = 20;

const USE_OPTIONS: { value: 'shared' | 'personal'; label: string }[] = [
  { value: 'shared', label: '함께 쓰기' },
  { value: 'personal', label: '혼자 쓰기' },
];

/** 새 공간 만들기 (함께 쓰기 / 혼자 쓰는 개인 공간). 함께 쓰면 만들고 나서 초대 화면으로 */
export default function NewSpaceScreen() {
  const { createSpace, updateSpace } = useSpaceStore.getState();
  const keyboardHeight = useKeyboardHeight();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(SPACE_EMOJIS[0]);
  /** 아이콘으로 고른 사진 (휴대폰 파일). 없으면 이모지 */
  const [imageUri, setImageUri] = useState<string | null>(null);
  /** 혼자 쓰는 개인 공간인지 */
  const [personal, setPersonal] = useState(false);
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
      const space = await createSpace(
        name.trim() || (personal ? '나의 공간' : '우리 공간'),
        emoji,
        personal
      );
      if (imageUri) {
        // 공간이 생겨야 그 폴더에 사진을 올릴 수 있다
        try {
          await updateSpace(space.id, { imageUri });
        } catch {
          showAlert(
            '사진은 올리지 못했어요',
            '공간은 만들어졌어요. 공간 관리에서 사진을 다시 골라주세요.'
          );
        }
      }
      await enterSpace(space.id, space.name);
      // 함께 쓰는 공간이면 바로 초대할 수 있게 공간 관리로, 개인 공간이면 그냥 닫는다
      if (personal) router.back();
      else router.replace('/space');
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
              {personal
                ? '나만 쓰는 공간이에요. 서버에 저장돼서\n폰을 바꿔도 계정 코드로 다시 볼 수 있어요.'
                : '연인, 친구, 가족 누구와도 함께 쓸 수 있어요.\n한 공간에 최대 10명까지 들어올 수 있어요.'}
            </Text>
          </View>

          <View>
            <FieldLabel>누구와 쓸까요?</FieldLabel>
            <Segmented
              options={USE_OPTIONS}
              value={personal ? 'personal' : 'shared'}
              onChange={(v) => setPersonal(v === 'personal')}
            />
          </View>

          <View>
            <FieldLabel>공간 이름</FieldLabel>
            <TextField
              value={name}
              onChangeText={setName}
              placeholder={
                personal
                  ? '예) 나의 버킷리스트, 혼자 여행'
                  : '예) 둘이서, 대학 친구들, 우리 가족'
              }
              maxLength={NAME_MAX}
              autoFocus
            />
          </View>

          <View>
            <FieldLabel>아이콘 (사진 또는 그림)</FieldLabel>
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
