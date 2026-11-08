import { Image } from 'expo-image';
import { ImagePlus, X } from 'lucide-react-native';
import { Pressable, ScrollView, View } from 'react-native';

import { Icon, Text } from '@/components/atoms';
import { FieldLabel } from '@/components/bucket/FieldLabel';
import {
  photoImageSource,
  usePhotoSource,
} from '@/components/bucket/DonePhoto';
import { pickPhotos } from '@/lib/bucket/photo';
import { MAX_ITEM_PHOTOS, type RecordPhoto } from '@/lib/bucket/types';
import { showAlert } from '@/lib/dialog';
import { hapticSelect } from '@/lib/haptics';
import { cn } from '@/lib/utils';

/** 사진 칸 크기 */
const THUMB_SIZE = 88;

type ItemPhotosFieldProps = {
  photos: RecordPhoto[];
  onChange: (photos: RecordPhoto[]) => void;
  /** 이번 화면에서 고른 사진을 뺄 때 (파일 정리용) */
  onRemove: (photo: RecordPhoto) => void;
};

/**
 * 버킷리스트 항목 사진 (최대 3장). 첫 번째가 대표 사진이고,
 * 다른 사진을 누르면 그 사진이 맨 앞(대표)으로 온다.
 */
export function ItemPhotosField({
  photos,
  onChange,
  onRemove,
}: ItemPhotosFieldProps) {
  const add = async () => {
    try {
      const uris = await pickPhotos(MAX_ITEM_PHOTOS - photos.length);
      if (uris.length === 0) return;
      // 새 사진은 아직 서버 경로가 없다 (저장할 때 올린다)
      onChange([...photos, ...uris.map((uri) => ({ uri, path: null }))]);
    } catch {
      showAlert('사진을 불러오지 못했어요', '잠시 후 다시 시도해주세요.');
    }
  };

  const makeCover = (index: number) => {
    if (index === 0) return;
    hapticSelect();
    const picked = photos[index];
    onChange([picked, ...photos.filter((_, i) => i !== index)]);
  };

  const removeAt = (index: number) => {
    onRemove(photos[index]);
    onChange(photos.filter((_, i) => i !== index));
  };

  return (
    <View>
      <FieldLabel>{`사진 (선택, ${photos.length}/${MAX_ITEM_PHOTOS})`}</FieldLabel>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2"
      >
        {photos.map((photo, i) => (
          <PhotoThumb
            key={photo.path ?? photo.uri ?? i}
            photo={photo}
            cover={i === 0}
            onPress={() => makeCover(i)}
            onRemove={() => removeAt(i)}
          />
        ))}
        {photos.length < MAX_ITEM_PHOTOS ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="사진 추가하기"
            onPress={() => void add()}
            className="items-center justify-center gap-1 rounded-2xl border border-dashed border-muted active:opacity-70"
            style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
          >
            <Icon as={ImagePlus} size={24} className="text-muted-foreground" />
            <Text variant="muted" size={12}>
              사진 추가
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
      <Text size={12} className="mt-2 text-muted-foreground">
        {photos.length > 1
          ? '사진을 누르면 대표 사진으로 바뀌어요. 대표 사진이 목록에서 아이콘 대신 보여요'
          : '대표 사진이 목록에서 아이콘 대신 보여요'}
      </Text>
    </View>
  );
}

/** 사진 한 칸: 누르면 대표로, 오른쪽 위 X로 빼기. 대표 사진엔 '대표' 표시 */
function PhotoThumb({
  photo,
  cover,
  onPress,
  onRemove,
}: {
  photo: RecordPhoto;
  cover: boolean;
  onPress: () => void;
  onRemove: () => void;
}) {
  const uri = usePhotoSource(photo.uri, photo.path);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={cover ? '대표 사진' : '대표 사진으로 바꾸기'}
      accessibilityState={{ selected: cover }}
      onPress={onPress}
      className={cn(
        'overflow-hidden rounded-2xl bg-accent active:opacity-80',
        cover && 'border-2 border-primary'
      )}
      style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
    >
      <Image
        source={photoImageSource(uri)}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
      />
      {cover ? (
        <View className="absolute bottom-1.5 left-1.5 rounded-full bg-primary px-2 py-0.5">
          <Text size={10} weight="700" className="text-white">
            대표
          </Text>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="사진 빼기"
        hitSlop={6}
        onPress={onRemove}
        className="absolute right-1.5 top-1.5 h-6 w-6 items-center justify-center rounded-full bg-black/60"
      >
        <Icon as={X} size={14} className="text-white" />
      </Pressable>
    </Pressable>
  );
}
