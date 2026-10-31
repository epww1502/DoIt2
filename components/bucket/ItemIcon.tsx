import { Image } from 'expo-image';
import { View } from 'react-native';

import { Text } from '@/components/atoms';
import { usePhotoSource } from '@/components/bucket/DonePhoto';
import { categoryTint } from '@/constants/categoryTint';
import { useThemeMode } from '@/contexts/ThemeModeContext';
import { getCategory, itemPhotos, type BucketItem } from '@/lib/bucket/types';

type ItemIconProps = {
  item: Pick<BucketItem, 'category' | 'photos'>;
  /** 동그라미 지름(px) */
  size: number;
  /** 이모지 글자 크기. 기본은 지름의 45% */
  emojiSize?: number;
  /** 사진이 없을 때 동그라미 배경 없이 이모지만 (촘촘한 목록용) */
  bare?: boolean;
};

/** 항목 아이콘: 대표 사진이 있으면 동그란 사진, 없으면 카테고리 이모지 */
export function ItemIcon({ item, size, emojiSize, bare }: ItemIconProps) {
  const { colorScheme } = useThemeMode();
  const cover = itemPhotos(item)[0];
  const emoji = getCategory(item.category).emoji;
  const fontSize = emojiSize ?? Math.round(size * 0.45);

  if (!cover) {
    if (bare) return <Text size={fontSize}>{emoji}</Text>;
    // 카테고리마다 다른 파스텔 동그라미 + 점선 테두리
    const tint = categoryTint(item.category, colorScheme);
    return (
      <View
        className="items-center justify-center rounded-full"
        style={{
          width: size,
          height: size,
          backgroundColor: tint.bg,
          borderColor: tint.border,
          borderWidth: 1.5,
          borderStyle: 'dashed',
        }}
      >
        <Text size={fontSize}>{emoji}</Text>
      </View>
    );
  }
  return <CoverPhoto uri={cover.uri} path={cover.path} size={size} />;
}

function CoverPhoto({
  uri,
  path,
  size,
}: {
  uri: string | null;
  path: string | null;
  size: number;
}) {
  const source = usePhotoSource(uri, path);
  return (
    <View
      className="overflow-hidden rounded-full bg-accent"
      style={{ width: size, height: size }}
    >
      <Image
        source={source ? { uri: source } : undefined}
        style={{ width: size, height: size }}
        contentFit="cover"
        transition={150}
      />
    </View>
  );
}
