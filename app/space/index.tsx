import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert } from '@/lib/dialog';
import {
  Button,
  CopyableCode,
  NavBar,
  Text,
  TextField,
} from '@/components/atoms';
import { BottomBar } from '@/components/bucket/BottomBar';
import { EmptyState } from '@/components/bucket/EmptyState';
import { FieldLabel } from '@/components/bucket/FieldLabel';
import { SpaceAvatar } from '@/components/space/SpaceAvatar';
import { SpaceIconPicker } from '@/components/space/SpaceIconPicker';
import { SpaceMembers } from '@/components/space/SpaceMembers';
import { confirmLeaveSpace } from '@/components/space/spaceFlow';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { deletePhoto } from '@/lib/bucket/photo';
import { resetInviteCode } from '@/lib/supabase/account';
import { useBucketStore } from '@/store/useBucketStore';
import {
  MAX_SPACE_MEMBERS,
  useSpace,
  useSpaceStore,
} from '@/store/useSpaceStore';

/** 공간 관리: 초대 코드 보내기, 멤버, 이름·아이콘 바꾸기, 나가기. id가 없으면 지금 보고 있는 공간 */
export default function SpaceScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const currentId = useBucketStore((s) => s.spaceId);
  const spaceId = id ?? currentId;
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
  const { updateSpace } = useSpaceStore.getState();
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
      showAlert(e instanceof Error ? e.message : '저장하지 못했어요');
    } finally {
      setBusy(false);
    }
  };

  const isOwner = useSpaceStore((s) => s.userId) === space.owner_id;

  const confirmResetCode = () =>
    showAlert(
      '초대 코드를 바꿀까요?',
      '지금 코드로는 더 이상 들어올 수 없어요. 이미 들어온 멤버는 그대로예요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '바꾸기',
          onPress: async () => {
            try {
              await resetInviteCode(spaceId);
              await useSpaceStore.getState().refreshSpaces();
            } catch (e) {
              showAlert(e instanceof Error ? e.message : '바꾸지 못했어요');
            }
          },
        },
      ]
    );

  const share = () =>
    Share.share({
      message: `DoIt2에서 '${space.name}' 버킷리스트 같이 쓰자 ${space.emoji}\n초대 코드: ${space.invite_code}`,
    });

  const confirmLeave = () => confirmLeaveSpace(space, () => router.back());

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
            <CopyableCode
              code={space.invite_code}
              doneMessage="초대 코드를 복사했어요"
              size={30}
            />
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
            {isOwner ? (
              <Pressable hitSlop={8} onPress={confirmResetCode}>
                <Text size={12} className="text-muted-foreground">
                  초대 코드 바꾸기
                </Text>
              </Pressable>
            ) : null}
          </View>

          {/* 멤버: 내 줄을 누르면 이 공간에서의 내 프로필을 바꾼다 */}
          <View>
            <FieldLabel>{`멤버 ${space.memberCount}명`}</FieldLabel>
            <SpaceMembers spaceId={spaceId} memberCount={space.memberCount} />
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
