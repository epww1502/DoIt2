import { showAlert } from '@/lib/dialog';
import { errorMessage } from '@/lib/errors';
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
