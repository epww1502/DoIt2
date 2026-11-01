import { Image } from 'expo-image';
import { View } from 'react-native';

import { CategoryIcon } from '@/components/bucket/CategoryIcon';
import { usePhotoSource } from '@/components/bucket/DonePhoto';
import { categoryTint } from '@/constants/categoryTint';
import { useThemeMode } from '@/contexts/ThemeModeContext';
import { itemPhotos, type BucketItem } from '@/lib/bucket/types';

type ItemIconProps = {
  item: Pick<BucketItem, 'category' | 'photos'>;
  /** 동그라미 지름(px) */
  size: number;
  /** 아이콘 크기. 기본은 지름의 45% */
  iconSize?: number;
  /** 사진이 없을 때 점선 테두리 없이 파스텔 동그라미만 (촘촘한 목록·카드용) */
  bare?: boolean;
};

/** 항목 아이콘: 대표 사진이 있으면 동그란 사진, 없으면 카테고리 선 아이콘 */
export function ItemIcon({ item, size, iconSize, bare }: ItemIconProps) {
  const { colorScheme } = useThemeMode();
  const cover = itemPhotos(item)[0];

  if (!cover) {
    // 카테고리마다 다른 파스텔 동그라미 (+ 점선 테두리)
    const tint = categoryTint(item.category, colorScheme);
    return (
      <View
        className="items-center justify-center rounded-full"
        style={{
          width: size,
          height: size,
          backgroundColor: tint.bg,
          ...(bare
            ? null
            : {
                borderColor: tint.border,
                borderWidth: 1.5,
                borderStyle: 'dashed' as const,
              }),
        }}
      >
        <CategoryIcon
          category={item.category}
          size={iconSize ?? Math.round(size * 0.45)}
        />
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
