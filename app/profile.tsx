import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert } from '@/lib/dialog';
import { showErrorAlert } from '@/lib/errors';
import {
  Button,
  CopyableCode,
  ErrorState,
  NavBar,
  Text,
  TextField,
} from '@/components/atoms';
import { BottomBar } from '@/components/bucket/BottomBar';
import { FieldLabel } from '@/components/bucket/FieldLabel';
import { AvatarField } from '@/components/space/AvatarField';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { deletePhoto } from '@/lib/bucket/photo';
import { issueAccountCode } from '@/lib/supabase/account';
import { useBucketStore } from '@/store/useBucketStore';
import { useRecentPlacesStore } from '@/store/useRecentPlacesStore';
import { useInboxStore } from '@/store/useInboxStore';
import { useLocalInboxStore } from '@/store/useLocalInboxStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useSpaceStore } from '@/store/useSpaceStore';

/**
 * 내 기본 프로필(모든 공간에 기본으로 보임)과 계정 코드.
 * 프로필을 서버에서 불러온 뒤에만 고칠 수 있게 한다 (모르는 채로 저장하면 덮어쓴다).
 */
export default function ProfileScreen() {
  const loadStatus = useProfileStore((s) => s.loadStatus);
  const loadError = useProfileStore((s) => s.loadError);
  const spaceStatus = useSpaceStore((s) => s.status);

  // 아직 안 불러왔거나 실패했으면 들어올 때 다시 불러온다
  useEffect(() => {
    if (spaceStatus !== 'ready') return;
    const { loadStatus: now, load } = useProfileStore.getState();
    if (now === 'idle' || now === 'error') void load().catch(() => {});
  }, [spaceStatus]);

  if (loadStatus === 'ready') return <ProfileForm />;

  const retry = () => {
    const space = useSpaceStore.getState();
    if (space.status === 'error') {
      void space.init();
      return;
    }
    void useProfileStore
      .getState()
      .load()
      .catch(() => {});
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar title="내 프로필" />
      {loadStatus === 'error' || spaceStatus === 'error' ? (
        <ErrorState
          error={loadError}
          title="프로필을 불러오지 못했어요"
          onRetry={retry}
        />
      ) : (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      )}
    </SafeAreaView>
  );
}

function ProfileForm() {
  const profile = useProfileStore((s) => s.profile);
  const save = useProfileStore((s) => s.save);
  const keyboardHeight = useKeyboardHeight();

  const [nickname, setNickname] = useState(profile?.nickname ?? '');
  /** 새로 고른 사진(휴대폰 파일), null: 사진 빼기, undefined: 그대로 */
  const [avatarUri, setAvatarUri] = useState<string | null | undefined>();
  const [busy, setBusy] = useState(false);

  const savedPath = profile?.avatar_path ?? null;
  const photoChanged =
    avatarUri !== undefined && !(avatarUri === null && !savedPath);
  const changed = nickname.trim() !== (profile?.nickname ?? '') || photoChanged;

  const pick = (uri: string) => {
    if (avatarUri) deletePhoto(avatarUri);
    setAvatarUri(uri);
  };
  const remove = () => {
    if (avatarUri) deletePhoto(avatarUri);
    setAvatarUri(null);
  };

  const submit = async () => {
    setBusy(true);
    try {
      await save({
        nickname: nickname.trim() || null,
        avatarUri: photoChanged ? avatarUri : undefined,
      });
      setAvatarUri(undefined);
      router.back();
    } catch (e) {
      showErrorAlert('저장하지 못했어요', e, submit);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar title="내 프로필" />
      <View className="flex-1" style={{ paddingBottom: keyboardHeight }}>
        <ScrollView
          contentContainerClassName="gap-6 px-5 pb-8 pt-4"
          keyboardShouldPersistTaps="handled"
        >
          <AvatarField
            imagePath={avatarUri === undefined ? savedPath : null}
            localUri={avatarUri ?? null}
            onPick={pick}
            onRemove={remove}
          />
          <View>
            <FieldLabel>닉네임 (선택)</FieldLabel>
            <TextField
              value={nickname}
              onChangeText={setNickname}
              placeholder="비워두면 '익명'으로 보여요"
              maxLength={20}
            />
            <Text size={12} className="mt-2 text-muted-foreground">
              모든 공간에 기본으로 보여요. 공간마다 다른 닉네임·사진을 쓰거나
              숨기려면 공간 관리에서 바꿀 수 있어요.
            </Text>
          </View>

          <AccountCodeSection />
          <DeleteAccountLink />
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
    </SafeAreaView>
  );
}

/** 계정 코드: 다른 폰에서 이 계정을 다시 불러올 때 쓴다 */
function AccountCodeSection() {
  const userId = useSpaceStore((s) => s.userId);
  const saved = useSettingsStore((s) => s.accountCode);
  const setAccountCode = useSettingsStore((s) => s.setAccountCode);
  const [busy, setBusy] = useState(false);
  // 다른 계정으로 바꾼 뒤라면 예전 코드는 보여주지 않는다
  const code = saved && saved.userId === userId ? saved.code : null;

  const issue = async () => {
    if (!userId) return;
    setBusy(true);
    try {
      setAccountCode({ userId, code: await issueAccountCode() });
    } catch (e) {
      showAlert(e instanceof Error ? e.message : '코드를 만들지 못했어요');
    } finally {
      setBusy(false);
    }
  };

  const confirmReissue = () =>
    showAlert('새 코드를 만들까요?', '지금 코드는 더 이상 쓸 수 없게 돼요.', [
      { text: '취소', style: 'cancel' },
      { text: '새로 만들기', onPress: () => void issue() },
    ]);

  return (
    <View className="gap-3 rounded-2xl p-5 bg-accent">
      <Text weight="600" size={16}>
        계정 코드
      </Text>
      <Text variant="muted" size={12}>
        폰을 바꾸거나 앱을 다시 깔면, 이 코드로 지금 계정을 다시 불러올 수
        있어요. 비밀번호처럼 나만 알고 있어야 해요.
      </Text>
      {code ? (
        <>
          <CopyableCode
            code={code}
            doneMessage="계정 코드를 복사했어요"
            size={22}
            className="rounded-xl"
          />
          <Button
            label="다른 곳에 저장하기"
            size="md"
            onPress={() =>
              void Share.share({ message: `DoIt2 계정 코드: ${code}` })
            }
          />
          <Pressable
            hitSlop={8}
            onPress={confirmReissue}
            className="self-center"
          >
            <Text size={12} className="text-muted-foreground">
              새 코드 만들기
            </Text>
          </Pressable>
        </>
      ) : (
        <Button
          label={busy ? '만드는 중…' : '계정 코드 만들기'}
          size="md"
          disabled={busy || !userId}
          onPress={() => void issue()}
        />
      )}
      <Pressable
        hitSlop={8}
        onPress={() => router.push('/account/restore')}
        className="self-center"
      >
        <Text size={12} className="text-muted-foreground">
          다른 폰에서 쓰던 계정 불러오기
        </Text>
      </Pressable>
    </View>
  );
}

/** 계정 삭제 (맨 아래 작은 글씨). 한 번 더 확인받고 지운다 */
function DeleteAccountLink() {
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    try {
      await useSpaceStore.getState().deleteAccount();
      // 이 폰에 남은 데이터도 비운다
      useBucketStore.getState().resetAll();
      useProfileStore.setState({ profile: null });
      useSettingsStore.getState().setAccountCode(null);
      useRecentPlacesStore.getState().clear();
      useInboxStore.getState().clear();
      useLocalInboxStore.getState().clear();
      router.dismissAll();
      showAlert('계정을 지웠어요', '새로 시작할 수 있어요.');
    } catch (e) {
      showAlert(e instanceof Error ? e.message : '계정을 지우지 못했어요');
    } finally {
      setBusy(false);
    }
  };

  const confirm = () =>
    showAlert(
      '계정을 지울까요?',
      [
        '되돌릴 수 없어요.',
        '· 혼자 쓰는 공간과 그 안의 기록·사진이 모두 지워져요.',
        '· 함께 쓰는 공간에서는 나가요. 내가 담은 항목은 공간에 남아요.',
        "· 프로필, 계정 코드, 이 폰의 '나만 보기' 기록도 지워져요.",
      ].join('\n'),
      [
        { text: '취소', style: 'cancel' },
        {
          text: '계정 지우기',
          style: 'destructive',
          onPress: () => void remove(),
        },
      ]
    );

  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      disabled={busy}
      onPress={confirm}
      className="mt-4 self-center"
    >
      <Text size={12} className="underline text-muted-foreground">
        {busy ? '지우는 중…' : '계정 삭제'}
      </Text>
    </Pressable>
  );
}
