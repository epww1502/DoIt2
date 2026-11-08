import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/atoms';
import { PersonAvatar } from '@/components/space/PersonAvatar';
import { usePhotoLikes } from '@/hooks/usePhotoLikes';
import { allRecordPhotos } from '@/lib/bucket/reviews';
import type { BucketItem } from '@/lib/bucket/types';
import { cn } from '@/lib/utils';
import { useBucketStore } from '@/store/useBucketStore';
import { useMemberLookup } from '@/store/useMembersStore';
import { useSpace } from '@/store/useSpaceStore';

import { LikeCount } from './LikeCount';
import { PhotoGallery } from './DonePhoto';

/** 칩에서 고른 사람. 'all': 모두, null: 예전 기록에 함께 붙어 있던 사진 */
type Filter = 'all' | string | null;

/**
 * 공간 기록 사진: 모두가 올린 사진을 한 앨범으로 모아 넘겨 본다.
 * 사진마다 왼쪽 위에 올린 사람을 보여주고, 올린 사람이 둘 이상이면 위의 칩으로 골라 본다
 */
export function RecordAlbum({ item }: { item: BucketItem }) {
  const spaceId = useBucketStore((s) => s.spaceId);
  const member = useMemberLookup(spaceId);
  const [filter, setFilter] = useState<Filter>('all');
  // 함께 쓰는 공간이면 사진마다 하트 수
  const shared = (useSpace(spaceId)?.memberCount ?? 0) > 1;
  const likes = usePhotoLikes(shared ? spaceId : null);

  const all = allRecordPhotos(item);
  if (all.length === 0) return null;

  // 올린 사람 순서대로 (나를 맨 앞에)
  const authors: (string | null)[] = [];
  for (const p of all) if (!authors.includes(p.by)) authors.push(p.by);
  authors.sort((a, b) => Number(isMe(b)) - Number(isMe(a)));
  function isMe(by: string | null) {
    return by !== null && member(by).isMe;
  }

  // 고른 사람이 사진을 다 지웠으면 다시 모두로
  const current =
    filter !== 'all' && !authors.includes(filter) ? 'all' : filter;
  const photos = current === 'all' ? all : all.filter((p) => p.by === current);
  const label = (by: string | null) => (by === null ? '함께' : member(by).name);

  return (
    <View>
      <PhotoGallery
        // 칩을 바꾸면 첫 장부터
        key={String(current)}
        photos={photos}
        itemId={item.id}
        corner={(i) => <LikeCount count={likes.countOf(photos[i]?.path)} />}
        caption={(i) => {
          const by = photos[i]?.by ?? null;
          return by === null ? null : `${member(by).name}의 사진`;
        }}
        overlay={(i) => {
          const by = photos[i]?.by ?? null;
          if (by === null) return null;
          const who = member(by);
          return (
            <View className="flex-row items-center gap-1.5 rounded-full bg-black/60 py-1 pl-1 pr-2.5">
              <PersonAvatar imagePath={who.avatarPath} size={20} />
              <Text size={12} weight="600" className="text-white">
                {who.name}
              </Text>
            </View>
          );
        }}
      />
      {authors.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 px-4 pt-3"
        >
          <Chip
            label={`전체 ${all.length}`}
            active={current === 'all'}
            onPress={() => setFilter('all')}
          />
          {authors.map((by) => (
            <Chip
              key={by ?? 'shared'}
              label={`${label(by)} ${all.filter((p) => p.by === by).length}`}
              active={current === by}
              onPress={() => setFilter(by)}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={cn(
        'h-8 items-center justify-center rounded-full px-3 active:opacity-70',
        active ? 'bg-primary' : 'bg-accent'
      )}
    >
      <Text
        size={13}
        weight="600"
        className={active ? 'text-primary-foreground' : 'text-foreground'}
      >
        {label}
      </Text>
    </Pressable>
  );
}
