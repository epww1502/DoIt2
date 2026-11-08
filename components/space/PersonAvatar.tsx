import { Image } from 'expo-image';
import { Crown, User } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon } from '@/components/atoms';
import {
  photoImageSource,
  usePhotoSource,
} from '@/components/bucket/DonePhoto';
import { usePrimaryColor } from '@/store/useSettingsStore';

type PersonAvatarProps = {
  /** 서버에 올라간 프로필 사진 */
  imagePath?: string | null;
  /** 방금 고른(아직 안 올린) 휴대폰 사진 */
  localUri?: string | null;
  /** 지름(px) */
  size: number;
  /** 공간장이면 왼쪽 위에 작은 왕관 */
  crown?: boolean;
};

/** 프로필 사진: 사진이 없으면(또는 공개를 껐으면) 사람 모양 */
export function PersonAvatar({
  imagePath,
  localUri,
  size,
  crown,
}: PersonAvatarProps) {
  const uri = usePhotoSource(localUri, imagePath);
  const hasPhoto = Boolean(localUri || imagePath);
  const primary = usePrimaryColor();
  const badge = Math.max(16, Math.round(size * 0.46));

  const avatar = (
    <View
      className="items-center justify-center overflow-hidden rounded-full bg-accent"
      style={{ width: size, height: size }}
    >
      {hasPhoto ? (
        <Image
          source={photoImageSource(uri)}
          style={{ width: size, height: size }}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <Icon
          as={User}
          size={Math.round(size * 0.5)}
          className="text-muted-foreground"
        />
      )}
    </View>
  );
  if (!crown) return avatar;

  return (
    <View style={{ width: size, height: size }}>
      {avatar}
      {/* 사진 바깥으로 살짝 나오게 두고, 배경색 테두리로 사진과 떼어 보이게 한다 */}
      <View
        accessibilityLabel="공간장"
        className="absolute items-center justify-center rounded-full border-2 border-background bg-background"
        style={{
          width: badge,
          height: badge,
          left: -badge * 0.25,
          top: -badge * 0.25,
        }}
      >
        <Icon
          as={Crown}
          size={Math.round(badge * 0.62)}
          className="text-primary"
          fill={primary}
        />
      </View>
    </View>
  );
}
