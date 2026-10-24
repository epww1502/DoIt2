import { Alert } from 'react-native';

import { LOCAL_KEY, useBucketStore } from '@/store/useBucketStore';

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
      Alert.alert(
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
      } catch {
        Alert.alert(
          '옮기지 못했어요',
          "인터넷 연결을 확인해주세요. '나만 보기'에 그대로 남아 있어요."
        );
      }
    }
  }
  await useBucketStore
    .getState()
    .switchSpace(spaceId)
    .catch(() => {});
}
