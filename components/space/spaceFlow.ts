import { showAlert } from '@/lib/dialog';
import { errorMessage, showErrorAlert } from '@/lib/errors';
import {
  blockUser,
  REPORT_REASONS,
  reportContent,
  type ReportReason,
} from '@/lib/supabase/social';
import { LOCAL_KEY, useBucketStore } from '@/store/useBucketStore';
import { type Space, useSpaceStore } from '@/store/useSpaceStore';

/** 공간을 만들 때 고를 수 있는 이모지 */
export const SPACE_EMOJIS = [
  '✨',
  '🧑‍🤝‍🧑',
  '👯',
  '👨‍👩‍👧',
  '🍻',
  '🏕️',
  '🎒',
  '🐶',
  '🌈',
  '🌱',
];

/** '나만 보기'에 남아 있는 항목 수 */
function localCount() {
  const { spaceId, items, cache } = useBucketStore.getState();
  return spaceId === null ? items.length : (cache[LOCAL_KEY]?.length ?? 0);
}

/**
 * 새로 만들거나 들어간 공간으로 이동한다.
 * '나만 보기'에 항목이 있으면 이 공간으로 옮길지 물어본다.
 */
export async function enterSpace(spaceId: string, spaceName: string) {
  const count = localCount();
  if (count > 0) {
    const move = await new Promise<boolean>((resolve) =>
      showAlert(
        `'나만 보기'의 ${count}개를 옮길까요?`,
        `이 휴대폰에만 있던 버킷리스트와 기록을 '${spaceName}'에 같이 올려요.`,
        [
          {
            text: '그대로 두기',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          { text: '옮기기', onPress: () => resolve(true) },
        ],
        { cancelable: false }
      )
    );
    if (move) {
      try {
        await useBucketStore.getState().moveLocalTo(spaceId);
      } catch (e) {
        showAlert(
          '옮기지 못했어요',
          `${errorMessage(e)} '나만 보기'에 그대로 남아 있어요.`
        );
      }
    }
  }
  await useBucketStore
    .getState()
    .switchSpace(spaceId)
    .catch(() => {});
}

/**
 * 공간에서 나가기 (확인을 받고). 보고 있던 공간이면 '나만 보기'로 돌아간다.
 * 나갔으면 onLeft를 부른다.
 */
export function confirmLeaveSpace(space: Space, onLeft?: () => void) {
  const { userId } = useSpaceStore.getState();
  const detail =
    space.memberCount <= 1
      ? '마지막 멤버라서, 나가면 이 공간의 버킷리스트와 기록이 모두 지워져요.'
      : space.owner_id === userId
        ? '공간장은 가장 먼저 들어온 멤버에게 넘어가요. 다시 들어오려면 초대 코드가 필요해요.'
        : '다시 들어오려면 초대 코드가 필요해요.';
  showAlert(`'${space.name}'에서 나갈까요?`, detail, [
    { text: '취소', style: 'cancel' },
    {
      text: '나가기',
      style: 'destructive',
      onPress: async () => {
        try {
          await useSpaceStore.getState().leaveSpace(space.id);
          if (useBucketStore.getState().spaceId === space.id) {
            await useBucketStore.getState().switchSpace(null);
          }
          onLeft?.();
        } catch (e) {
          showAlert(e instanceof Error ? e.message : '나가지 못했어요');
        }
      },
    },
  ]);
}

/** 여러 공간에서 한 번에 나가기 (확인을 받고). 다 나갔으면 onLeft */
export function confirmLeaveSpaces(spaces: Space[], onLeft?: () => void) {
  const { userId } = useSpaceStore.getState();
  const lastOnes = spaces.filter((s) => s.memberCount <= 1).length;
  const owned = spaces.filter(
    (s) => s.memberCount > 1 && s.owner_id === userId
  ).length;
  const notes = [
    lastOnes > 0
      ? `${lastOnes}개는 마지막 멤버라서 버킷리스트와 기록이 모두 지워져요.`
      : null,
    owned > 0
      ? `공간장인 ${owned}개는 가장 먼저 들어온 멤버에게 공간장이 넘어가요.`
      : null,
    '다시 들어오려면 초대 코드가 필요해요.',
  ].filter(Boolean);

  showAlert(`${spaces.length}개 공간에서 나갈까요?`, notes.join(' '), [
    { text: '취소', style: 'cancel' },
    {
      text: '나가기',
      style: 'destructive',
      onPress: async () => {
        const failed: string[] = [];
        for (const space of spaces) {
          try {
            await useSpaceStore.getState().leaveSpace(space.id);
            if (useBucketStore.getState().spaceId === space.id) {
              await useBucketStore.getState().switchSpace(null);
            }
          } catch {
            failed.push(space.name);
          }
        }
        if (failed.length > 0) {
          showAlert(
            '일부 공간에서 나가지 못했어요',
            `${failed.join(', ')} · 잠시 후 다시 시도해주세요.`
          );
        }
        onLeft?.();
      },
    },
  ]);
}

/**
 * 신고 사유를 골라 신고한다 (App Store 1.2). 운영자가 24시간 안에 확인한다.
 * comment가 있으면 그 댓글을, 없으면 사람을 신고한다.
 */
export function askReport(report: {
  spaceId: string;
  targetUserId: string;
  name: string;
  comment?: { id: string; body: string };
  /** 신고 뒤 차단까지 하면 부른다 (목록을 다시 받게) */
  onBlocked?: () => void;
}) {
  const { onBlocked, ...target } = report;
  const send = (reason: ReportReason) =>
    reportContent({ ...target, reason })
      .then(() =>
        showAlert(
          '신고했어요',
          '24시간 안에 확인하고 조치할게요. 더 보고 싶지 않다면 차단할 수도 있어요.',
          [
            { text: '닫기', style: 'cancel' },
            {
              text: '차단하기',
              style: 'destructive',
              onPress: () =>
                askBlock(report.targetUserId, report.name, onBlocked),
            },
          ]
        )
      )
      .catch((e) => showErrorAlert('신고하지 못했어요', e));
  showAlert(
    report.comment ? '댓글을 신고할까요?' : `${report.name}님을 신고할까요?`,
    '신고 이유를 골라주세요.',
    [
      // 버튼이 3개 이상이면 팝업이 거꾸로 쌓으므로 뒤집어 넘겨 위에서부터 이 순서로 보이게 한다
      ...[...REPORT_REASONS].reverse().map((r) => ({
        text: r.label,
        onPress: () => void send(r.value),
      })),
      { text: '취소', style: 'cancel' as const },
    ]
  );
}

/** 차단하면 그 사람의 댓글이 나에게 안 보인다. 멤버 목록에서 풀 수 있다 */
export function askBlock(userId: string, name: string, onBlocked?: () => void) {
  showAlert(
    `${name}님을 차단할까요?`,
    '차단하면 이 사람의 댓글이 보이지 않아요. 공간 멤버 목록에서 언제든 풀 수 있어요.',
    [
      { text: '취소', style: 'cancel' },
      {
        text: '차단하기',
        style: 'destructive',
        onPress: () =>
          blockUser(userId)
            .then(onBlocked)
            .catch((e) => showErrorAlert('차단하지 못했어요', e)),
      },
    ]
  );
}
