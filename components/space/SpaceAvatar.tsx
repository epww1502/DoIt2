import { Image } from 'expo-image';
import { View } from 'react-native';

import { Text } from '@/components/atoms';
import {
  photoImageSource,
  usePhotoSource,
} from '@/components/bucket/DonePhoto';
import { SPACE_ICON } from '@/constants/spaceIcon';
import { useThemeMode } from '@/contexts/ThemeModeContext';

type SpaceAvatarProps = {
  emoji: string;
  /** 서버에 올라간 공간 사진 */
  imagePath?: string | null;
  /** 방금 고른(아직 안 올린) 휴대폰 사진 */
  localUri?: string | null;
  /** 지름(px) */
  size: number;
};

/** 공간 아이콘: 사진이 있으면 동그란 사진, 없으면 파스텔 동그라미에 선 아이콘 (모르는 이모지는 글자로) */
export function SpaceAvatar({
  emoji,
  imagePath,
  localUri,
  size,
}: SpaceAvatarProps) {
  const uri = usePhotoSource(localUri, imagePath);
  const { colorScheme } = useThemeMode();
  const hasPhoto = Boolean(localUri || imagePath);
  const line = hasPhoto ? null : SPACE_ICON[emoji];
  const tint = line ? line.ramp[colorScheme] : null;

  return (
    <View
      className="items-center justify-center overflow-hidden rounded-full bg-accent"
      style={[
        { width: size, height: size },
        tint ? { backgroundColor: tint.bg } : null,
      ]}
    >
      {hasPhoto ? (
        <Image
          source={photoImageSource(uri)}
          style={{ width: size, height: size }}
          contentFit="cover"
          transition={150}
        />
      ) : line && tint ? (
        <line.icon
          size={Math.round(size * 0.48)}
          color={tint.fg}
          strokeWidth={size >= 40 ? 1.75 : 2}
        />
      ) : (
        <Text size={Math.round(size * 0.5)}>{emoji}</Text>
      )}
    </View>
  );
}
