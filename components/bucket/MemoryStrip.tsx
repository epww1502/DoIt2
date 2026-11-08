import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { Icon, Text } from '@/components/atoms';
import { CategoryIcon } from '@/components/bucket/CategoryIcon';
import {
  photoImageSource,
  usePhotoSource,
} from '@/components/bucket/DonePhoto';
import { todayKey } from '@/lib/date';
import { showAlert } from '@/lib/dialog';
import { memoryLabel, pickMemory, type Memory } from '@/lib/bucket/memory';
import type { BucketItem, RecordPhoto } from '@/lib/bucket/types';
import { useMemberLookup } from '@/store/useMembersStore';
import { openPhotoViewer } from '@/store/usePhotoViewerStore';
import { useSettingsStore } from '@/store/useSettingsStore';

const THUMB = 36;

/**
 * 일지 맨 위 한 줄 추억: '1년 전 오늘 · 한강 피크닉'.
 * 누르면 그날 사진을 크게 보기로(사진이 없으면 그 기록으로), 길게 누르면 오늘은 그만 보기.
 * 띄울 추억이 없거나 오늘 숨겼으면 그리지 않는다
 */
export function MemoryStrip({
  items,
  spaceId,
}: {
  items: BucketItem[];
  spaceId: string | null;
}) {
  const today = todayKey();
  const hiddenOn = useSettingsStore((s) => s.memoryHiddenOn);
  const memory = useMemo(() => pickMemory(items, today), [items, today]);
  const member = useMemberLookup(spaceId);
  if (!memory || hiddenOn === today) return null;

  const label = memoryLabel(memory);
  const open = () => openMemory(memory, label, (by) => member(by).name);
  const hide = () =>
    showAlert('오늘은 그만 볼까요?', '내일 다른 추억을 보여드려요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '오늘은 그만 보기',
        onPress: () =>
          useSettingsStore.getState().setMemoryHiddenOn(todayKey()),
      },
    ]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${memory.item.title}. 길게 누르면 오늘은 그만 보기`}
      onPress={open}
      onLongPress={hide}
      className="flex-row items-center gap-2.5 rounded-xl py-1.5 pl-1.5 pr-2.5 bg-accent active:opacity-70"
    >
      <Thumb photo={memory.photos[0]} item={memory.item} />
      <View className="flex-1">
        <Text size={11} className="text-muted-foreground">
          {label}
        </Text>
        <Text size={13} weight="600" numberOfLines={1}>
          {`'${memory.item.title}' ${memory.item.kind === 'place' ? '갔던' : '했던'} 날`}
        </Text>
      </View>
      <Icon as={ChevronRight} size={16} className="text-muted-foreground" />
    </Pressable>
  );
}

/** 그날 사진을 크게 보기로 (사진이 없으면 그 기록 화면) */
function openMemory(
  memory: Memory,
  label: string,
  nameOf: (by: string) => string
) {
  if (memory.photos.length === 0) {
    router.push({ pathname: '/item/[id]', params: { id: memory.item.id } });
    return;
  }
  openPhotoViewer(
    memory.photos.map((p) => ({
      uri: p.uri,
      path: p.path,
      caption: p.by
        ? `${label} · ${memory.item.title} · ${nameOf(p.by)}`
        : `${label} · ${memory.item.title}`,
      itemId: memory.item.id,
      by: p.by,
      link: true,
    })),
    0
  );
}

function Thumb({
  photo,
  item,
}: {
  photo: RecordPhoto | undefined;
  item: BucketItem;
}) {
  const uri = usePhotoSource(photo?.uri, photo?.path);
  return (
    <View
      className="items-center justify-center overflow-hidden rounded-lg bg-background"
      style={{ width: THUMB, height: THUMB }}
    >
      {photo ? (
        <Image
          source={photoImageSource(uri)}
          style={{ width: THUMB, height: THUMB }}
          contentFit="cover"
          transition={120}
        />
      ) : (
        <CategoryIcon category={item.category} size={20} />
      )}
    </View>
  );
}
