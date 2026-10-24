import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppSwitch, Button, NavBar, Text, TextField } from '@/components/atoms';
import { BottomBar } from '@/components/bucket/BottomBar';
import { FieldLabel } from '@/components/bucket/FieldLabel';
import { AvatarField } from '@/components/space/AvatarField';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { deletePhoto } from '@/lib/bucket/photo';
import { fetchSpaceMembers, saveSpaceProfile } from '@/lib/supabase/account';
import type { MemberProfile } from '@/lib/supabase/database.types';
import { useBucketStore } from '@/store/useBucketStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useSpace, useSpaceStore } from '@/store/useSpaceStore';

/** 공간에서의 내 프로필: 보이기 on/off, 이 공간에서만 쓸 닉네임·사진. id가 없으면 지금 공간 */
export default function SpaceProfileScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const currentId = useBucketStore((s) => s.spaceId);
  const spaceId = id ?? currentId;
  const space = useSpace(spaceId);
  const [me, setMe] = useState<MemberProfile | null>(null);

  useEffect(() => {
    if (!spaceId) return;
    let cancelled = false;
    fetchSpaceMembers(spaceId)
      .then((list) => {
        if (!cancelled) setMe(list.find((m) => m.is_me) ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [spaceId]);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar title={space ? `${space.name}에서의 나` : '공간 프로필'} />
      {space && me ? (
        // 받아온 값으로 편집을 시작하려고 따로 둔다
        <SpaceProfileForm spaceId={space.id} me={me} />
      ) : null}
    </SafeAreaView>
  );
}

function SpaceProfileForm({
  spaceId,
  me,
}: {
  spaceId: string;
  me: MemberProfile;
}) {
  const base = useProfileStore((s) => s.profile);
  const userId = useSpaceStore((s) => s.userId);
  const keyboardHeight = useKeyboardHeight();

  const [visible, setVisible] = useState(me.show_profile);
  const [nickname, setNickname] = useState(me.space_nickname ?? '');
  /** 새로 고른 사진(휴대폰 파일), null: 이 공간 사진 빼기(기본 사진으로), undefined: 그대로 */
  const [avatarUri, setAvatarUri] = useState<string | null | undefined>();
  const [busy, setBusy] = useState(false);

  const savedPath = me.space_avatar_path;
  const photoChanged =
    avatarUri !== undefined && !(avatarUri === null && !savedPath);
  const changed =
    visible !== me.show_profile ||
    nickname.trim() !== (me.space_nickname ?? '') ||
    photoChanged;

  // 보여줄 사진: 새로 고른 것 → 이 공간 사진 → 기본 사진
  const shownPath =
    avatarUri === undefined
      ? (savedPath ?? base?.avatar_path ?? null)
      : avatarUri === null
        ? (base?.avatar_path ?? null)
        : null;
  const hasSpacePhoto = avatarUri
    ? true
    : avatarUri === undefined && !!savedPath;

  const pick = (uri: string) => {
    if (avatarUri) deletePhoto(avatarUri);
    setAvatarUri(uri);
  };
  const resetPhoto = () => {
    if (avatarUri) deletePhoto(avatarUri);
    setAvatarUri(null);
  };

  const submit = async () => {
    if (!userId) return;
    setBusy(true);
    try {
      await saveSpaceProfile(userId, spaceId, savedPath, {
        visible,
        nickname: nickname.trim() || null,
        avatarUri: photoChanged ? avatarUri : undefined,
      });
      router.back();
    } catch {
      Alert.alert('저장하지 못했어요', '잠시 후 다시 시도해주세요.');
    } finally {
      if (avatarUri) deletePhoto(avatarUri);
      setBusy(false);
    }
  };

  return (
    <View className="flex-1" style={{ paddingBottom: keyboardHeight }}>
      <ScrollView
        contentContainerClassName="gap-6 px-5 pb-8 pt-4"
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-center gap-3 rounded-2xl p-4 bg-accent">
          <View className="flex-1 gap-0.5">
            <Text weight="600" size={16}>
              이 공간에 내 프로필 보이기
            </Text>
            <Text variant="muted" size={12}>
              {"끄면 닉네임과 사진을 숨기고 '익명'으로 보여요"}
            </Text>
          </View>
          <AppSwitch
            accessibilityLabel="이 공간에 내 프로필 보이기"
            value={visible}
            onValueChange={setVisible}
          />
        </View>

        {visible ? (
          <>
            <AvatarField
              imagePath={shownPath}
              localUri={avatarUri ?? null}
              onPick={pick}
              onRemove={hasSpacePhoto ? resetPhoto : undefined}
              removeLabel="기본 사진으로"
            />
            <View>
              <FieldLabel>이 공간에서 쓸 닉네임 (선택)</FieldLabel>
              <TextField
                value={nickname}
                onChangeText={setNickname}
                placeholder={
                  base?.nickname
                    ? `비워두면 '${base.nickname}'`
                    : "비워두면 '익명'"
                }
                maxLength={20}
              />
              <Text size={12} className="mt-2 text-muted-foreground">
                비워두면 내 프로필의 기본 닉네임·사진이 보여요.
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>
      {changed ? (
        <BottomBar>
          <Button
            label={busy ? '저장하는 중…' : '저장하기'}
            disabled={busy}
            onPress={() => void submit()}
          />
        </BottomBar>
      ) : null}
    </View>
  );
}
