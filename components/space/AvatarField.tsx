import { Pressable, View } from 'react-native';

import { showAlert } from '@/lib/dialog';
import { Text } from '@/components/atoms';
import { pickPhoto } from '@/lib/bucket/photo';

import { PersonAvatar } from './PersonAvatar';

type AvatarFieldProps = {
  /** 서버에 올라간 사진 */
  imagePath: string | null;
  /** 새로 고른(아직 안 올린) 휴대폰 사진 */
  localUri: string | null;
  onPick: (uri: string) => void;
  /** 없으면 '사진 빼기'를 안 보여준다 */
  onRemove?: () => void;
  /** '사진 빼기' 대신 보일 글자 (예: '기본 사진으로') */
  removeLabel?: string;
};

/** 동그란 프로필 사진. 누르면 앨범에서 고르고, 아래 작은 글씨로 뺄 수 있다 */
export function AvatarField({
  imagePath,
  localUri,
  onPick,
  onRemove,
  removeLabel = '사진 빼기',
}: AvatarFieldProps) {
  const hasPhoto = Boolean(localUri || imagePath);

  const choose = async () => {
    try {
      const uri = await pickPhoto({ aspect: [1, 1] });
      if (uri) onPick(uri);
    } catch {
      showAlert('사진을 불러오지 못했어요', '잠시 후 다시 시도해주세요.');
    }
  };

  return (
    <View className="items-center gap-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="프로필 사진 고르기"
        onPress={() => void choose()}
        className="active:opacity-70"
      >
        <PersonAvatar imagePath={imagePath} localUri={localUri} size={88} />
      </Pressable>
      <Pressable hitSlop={8} onPress={() => void choose()}>
        <Text size={13} weight="600" className="text-primary">
          {hasPhoto ? '사진 바꾸기' : '사진 고르기'}
        </Text>
      </Pressable>
      {hasPhoto && onRemove ? (
        <Pressable hitSlop={8} onPress={onRemove}>
          <Text size={12} className="text-muted-foreground">
            {removeLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
