import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Share, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, NavBar, Text, TextField } from '@/components/atoms';
import { BottomBar } from '@/components/bucket/BottomBar';
import { EmptyState } from '@/components/bucket/EmptyState';
import { FieldLabel } from '@/components/bucket/FieldLabel';
import { SpaceAvatar } from '@/components/space/SpaceAvatar';
import { SpaceIconPicker } from '@/components/space/SpaceIconPicker';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { deletePhoto } from '@/lib/bucket/photo';
import { useBucketStore } from '@/store/useBucketStore';
import {
  MAX_SPACE_MEMBERS,
  useSpace,
  useSpaceStore,
} from '@/store/useSpaceStore';

/** 지금 보고 있는 공간 관리: 초대 코드 보내기, 이름·아이콘 바꾸기, 나가기 */
export default function SpaceScreen() {
  const spaceId = useBucketStore((s) => s.spaceId);
  const space = useSpace(spaceId);

  if (!space) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <NavBar title="공간" />
        <EmptyState
          emoji="📱"
          title="지금은 '나만 보기'예요"
          description="공간을 만들면 친구, 연인, 가족과 함께 쓸 수 있어요."
          actionLabel="새 공간 만들기"
          onAction={() => router.replace('/space/new')}
        />
      </SafeAreaView>
    );
  }

  // 공간마다 편집 상태를 새로 시작하려고 key를 준다
  return <SpaceManage key={space.id} spaceId={space.id} />;
}

function SpaceManage({ spaceId }: { spaceId: string }) {
  const space = useSpace(spaceId)!;
  const { updateSpace, leaveSpace } = useSpaceStore.getState();
  const keyboardHeight = useKeyboardHeight();

  const [name, setName] = useState(space.name);
  const [emoji, setEmoji] = useState(space.emoji);
  /** 새로 고른 사진(휴대폰 파일), null: 사진 빼기(이모지로), undefined: 그대로 */
  const [imageUri, setImageUri] = useState<string | null | undefined>();
  const [busy, setBusy] = useState(false);

  const usingPhoto =
    imageUri !== undefined ? imageUri !== null : Boolean(space.image_path);
  const photoChanged =
    imageUri !== undefined && !(imageUri === null && !space.image_path);
  const changed =
    name.trim() !== space.name || emoji !== space.emoji || photoChanged;

  const chooseEmoji = (e: string) => {
    if (imageUri) deletePhoto(imageUri);
    setImageUri(null);
    setEmoji(e);
  };

  const choosePhoto = (uri: string) => {
    if (imageUri) deletePhoto(imageUri);
    setImageUri(uri);
  };

  const save = async () => {
    setBusy(true);
    try {
      await updateSpace(spaceId, {
        name: name.trim() || space.name,
        emoji,
        imageUri: photoChanged ? imageUri : undefined,
      });
      setImageUri(undefined);
    } catch (e) {
      Alert.alert(e instanceof Error ? e.message : '저장하지 못했어요');
    } finally {
      setBusy(false);
    }
  };

  const share = () =>
    Share.share({
      message: `DoIt2에서 '${space.name}' 버킷리스트 같이 쓰자 ${space.emoji}\n초대 코드: ${space.invite_code}`,
    });

  const confirmLeave = () =>
    Alert.alert(
      `'${space.name}'에서 나갈까요?`,
      space.memberCount <= 1
        ? '마지막 멤버라서, 나가면 이 공간의 버킷리스트와 기록이 모두 지워져요.'
        : '다시 들어오려면 초대 코드가 필요해요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '나가기',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveSpace(spaceId);
              await useBucketStore.getState().switchSpace(null);
              router.back();
            } catch (e) {
              Alert.alert(e instanceof Error ? e.message : '나가지 못했어요');
            }
          },
        },
      ]
    );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar title="공간 관리" />
      <View className="flex-1" style={{ paddingBottom: keyboardHeight }}>
        <ScrollView
          contentContainerClassName="gap-6 px-5 pb-8 pt-2"
          keyboardShouldPersistTaps="handled"
        >
          {/* 초대 */}
          <View className="items-center gap-3 rounded-3xl p-6 bg-accent">
            <SpaceAvatar
              emoji={emoji}
              localUri={imageUri ?? null}
              imagePath={imageUri === undefined ? space.image_path : null}
              size={72}
            />
            <Text weight="700" size={20}>
              {space.name}
            </Text>
            <Text variant="muted" size={13}>
              {space.memberCount}명 / 최대 {MAX_SPACE_MEMBERS}명
            </Text>
            <View className="rounded-2xl px-6 py-3 bg-background">
              <Text weight="800" size={30} className="tracking-[6px]">
                {space.invite_code}
              </Text>
            </View>
            <Text variant="muted" size={12} className="text-center">
              함께할 사람이 &apos;초대 코드로 들어가기&apos;에 이 코드를 넣으면
              들어와요
            </Text>
            <Button
              label="초대 코드 보내기"
              size="md"
              className="self-stretch"
              onPress={() => void share()}
            />
          </View>

          {/* 이름·아이콘 */}
          <View>
            <FieldLabel>공간 이름</FieldLabel>
            <TextField value={name} onChangeText={setName} maxLength={20} />
          </View>
          <View>
            <FieldLabel>아이콘 (사진 또는 이모지)</FieldLabel>
            <SpaceIconPicker
              emoji={emoji}
              usingPhoto={usingPhoto}
              onEmoji={chooseEmoji}
              onPhoto={choosePhoto}
            />
          </View>

          <Button
            label="이 공간에서 나가기"
            variant="ghost"
            size="md"
            onPress={confirmLeave}
          />
        </ScrollView>
        {changed ? (
          <BottomBar>
            <Button
              label={busy ? '저장하는 중…' : '저장하기'}
              disabled={busy}
              onPress={() => void save()}
            />
          </BottomBar>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
