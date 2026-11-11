import { ImagePlus } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/atoms';
import { pickPhoto, showPhotoLoadError } from '@/lib/bucket/photo';
import { cn } from '@/lib/utils';

import { SpaceAvatar } from './SpaceAvatar';
import { SPACE_EMOJIS } from './spaceFlow';

type SpaceIconPickerProps = {
  emoji: string;
  /** 사진을 쓰고 있는지 (새로 고른 사진이든 이미 올린 사진이든) */
  usingPhoto: boolean;
  onEmoji: (emoji: string) => void;
  /** 앨범에서 고른 사진 (휴대폰 파일) */
  onPhoto: (uri: string) => void;
};

/** 공간 아이콘 고르기: 맨 앞 '사진' 버튼 + 아이콘들. 아이콘을 고르면 사진은 빠진다 */
export function SpaceIconPicker({
  emoji,
  usingPhoto,
  onEmoji,
  onPhoto,
}: SpaceIconPickerProps) {
  const choosePhoto = async () => {
    try {
      const uri = await pickPhoto({ aspect: [1, 1] });
      if (uri) onPhoto(uri);
    } catch {
      showPhotoLoadError();
    }
  };

  return (
    <View className="flex-row flex-wrap gap-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="사진으로 아이콘 정하기"
        accessibilityState={{ selected: usingPhoto }}
        onPress={() => void choosePhoto()}
        className={cn(
          'h-12 w-12 items-center justify-center rounded-full bg-accent',
          usingPhoto && 'border-2 border-primary'
        )}
      >
        <Icon as={ImagePlus} size={20} className="text-primary" />
      </Pressable>
      {SPACE_EMOJIS.map((e) => {
        const selected = !usingPhoto && e === emoji;
        return (
          <Pressable
            key={e}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onEmoji(e)}
            className={cn(
              'h-12 w-12 items-center justify-center rounded-full',
              selected && 'border-2 border-primary'
            )}
          >
            <SpaceAvatar emoji={e} size={selected ? 40 : 48} />
          </Pressable>
        );
      })}
    </View>
  );
}
