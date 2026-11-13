import { CloudUpload, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Icon, Text } from '@/components/atoms';
import { showAlert } from '@/lib/dialog';
import { errorMessage } from '@/lib/errors';
import { hapticSuccess } from '@/lib/haptics';
import { useBucketStore } from '@/store/useBucketStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useSpaceStore } from '@/store/useSpaceStore';

import { backupLocal } from './spaceFlow';

/**
 * '나만 보기'(이 휴대폰에만 저장)를 보고 있고 항목이 minItems개 이상이면 백업을 권할 수 있다.
 * 서버에 연결돼 있을 때만.
 */
export function useBackupOffer(minItems: number) {
  const ready = useSpaceStore((s) => s.status === 'ready');
  const localCount = useBucketStore((s) =>
    s.spaceId === null ? s.items.length : 0
  );
  return ready && localCount >= minItems;
}

/**
 * '나만 보기'를 서버에 백업하라는 카드. 누르면 무엇이 올라가는지 알려 주고 확인을 받은 뒤 올린다.
 * 보여줄지는 useBackupOffer로 정한다. onDismiss를 주면 오른쪽 위에 닫기(X)가 생긴다.
 */
export function BackupCard({ onDismiss }: { onDismiss?: () => void }) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      await backupLocal();
      hapticSuccess();
      showAlert(
        '백업했어요',
        '이제 담는 것마다 서버에 저장돼요. 폰을 바꾸면 설정 > 내 프로필의 계정 코드로 다시 불러올 수 있어요.'
      );
    } catch (e) {
      showAlert(
        '백업하지 못했어요',
        `${errorMessage(e)} '나만 보기'에 그대로 남아 있어요.`
      );
    } finally {
      setBusy(false);
    }
  };

  const confirm = () =>
    showAlert(
      '서버에 백업할까요?',
      "'나만 보기'의 버킷리스트와 기록, 사진을 나만 볼 수 있는 개인 공간에 올려요. 앞으로 담는 것도 저절로 저장돼요.",
      [
        { text: '취소', style: 'cancel' },
        { text: '백업하기', onPress: () => void run() },
      ]
    );

  return (
    <View className="flex-row items-center gap-3 rounded-2xl px-4 py-3 bg-accent">
      <Icon as={CloudUpload} size={22} className="text-primary" />
      <View className="flex-1 gap-0.5">
        <Text weight="600" size={14}>
          버킷리스트 백업하기
        </Text>
        <Text size={12} className="text-muted-foreground">
          지금은 이 휴대폰에만 있어요. 백업하면 폰을 바꾸거나 앱을 지워도
          남아요.
        </Text>
      </View>
      {busy ? (
        <ActivityIndicator />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="버킷리스트 백업하기"
          hitSlop={6}
          onPress={confirm}
          className="h-9 items-center justify-center rounded-full bg-primary px-3.5 active:opacity-70"
        >
          <Text weight="600" size={13} className="text-primary-foreground">
            백업
          </Text>
        </Pressable>
      )}
      {onDismiss && !busy ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="백업 안내 닫기"
          hitSlop={8}
          onPress={onDismiss}
          className="h-7 w-7 items-center justify-center active:opacity-60"
        >
          <Icon as={X} size={16} className="text-muted-foreground" />
        </Pressable>
      ) : null}
    </View>
  );
}

/** 목록 위 안내: 항목이 이만큼 쌓이면 한 번 권한다 (닫으면 다시 안 보인다) */
export const BACKUP_NUDGE_MIN_ITEMS = 3;

/** 목록 화면 위에 보여줄지 (닫은 적이 없을 때만) */
export function useBackupNudge() {
  const offer = useBackupOffer(BACKUP_NUDGE_MIN_ITEMS);
  const dismissed = useSettingsStore((s) => s.backupNudgeDismissed);
  return offer && !dismissed;
}
