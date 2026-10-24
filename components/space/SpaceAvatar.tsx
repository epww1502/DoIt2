import { Image } from 'expo-image';
import { View } from 'react-native';

import { Text } from '@/components/atoms';
import { usePhotoSource } from '@/components/bucket/DonePhoto';

type SpaceAvatarProps = {
  emoji: string;
  /** 서버에 올라간 공간 사진 */
  imagePath?: string | null;
  /** 방금 고른(아직 안 올린) 휴대폰 사진 */
  localUri?: string | null;
  /** 지름(px) */
  size: number;
};

/** 공간 아이콘: 사진이 있으면 동그란 사진, 없으면 이모지 */
export function SpaceAvatar({
  emoji,
  imagePath,
  localUri,
  size,
}: SpaceAvatarProps) {
  const uri = usePhotoSource(localUri, imagePath);
  const hasPhoto = Boolean(localUri || imagePath);

  return (
    <View
      className="items-center justify-center overflow-hidden rounded-full bg-accent"
      style={{ width: size, height: size }}
    >
      {hasPhoto ? (
        <Image
          source={uri ? { uri } : undefined}
          style={{ width: size, height: size }}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <Text size={Math.round(size * 0.5)}>{emoji}</Text>
      )}
    </View>
  );
}
