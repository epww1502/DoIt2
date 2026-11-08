import dayjs from 'dayjs';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NavBar, Text } from '@/components/atoms';
import { usePhotoSource } from '@/components/bucket/DonePhoto';
import { EmptyState } from '@/components/bucket/EmptyState';
import { LikeCount } from '@/components/bucket/LikeCount';
import { SyncEmpty, useListSync } from '@/components/bucket/SyncNotice';
import { usePhotoLikes } from '@/hooks/usePhotoLikes';
import { useTogether } from '@/hooks/useTogether';
import {
  albumMonths,
  albumPhotos,
  photoKey,
  type AlbumPhoto,
} from '@/lib/bucket/album';
import { cn } from '@/lib/utils';
import { useBucketStore } from '@/store/useBucketStore';
import { useMemberLookup } from '@/store/useMembersStore';
import { openPhotoViewer } from '@/store/usePhotoViewerStore';
import { useSpace } from '@/store/useSpaceStore';

const COLUMNS = 3;
const GAP = 3;
const SIDE = 20;

/** 칩에서 고른 사람. 'all': 모두, null: 예전 기록에 함께 붙어 있던 사진 */
type Filter = 'all' | string | null;

/** 한 줄: 달 이름이거나 사진 세 칸 */
type Row =
  | { type: 'month'; key: string; label: string; count: number }
  | { type: 'photos'; key: string; photos: AlbumPhoto[] };

/**
 * 우리 사진: 이 공간 기록에 올린 사진을 모두 모아 달별 격자로 본다.
 * 위 칩으로 올린 사람을 고르고, 누르면 크게 보기(하트·기록 보기)
 */
export default function PhotoAlbumScreen() {
  const items = useBucketStore((s) => s.items);
  const spaceId = useBucketStore((s) => s.spaceId);
  const sync = useListSync();
  const together = useTogether();
  const member = useMemberLookup(spaceId);
  const shared = (useSpace(spaceId)?.memberCount ?? 0) > 1;
  const likes = usePhotoLikes(shared ? spaceId : null);
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState<Filter>('all');

  const all = useMemo(() => albumPhotos(items), [items]);

  // 올린 사람 (나를 맨 앞에, 그다음 많이 올린 순)
  const isMe = (by: string | null) => by !== null && member(by).isMe;
  const perAuthor = new Map<string | null, number>();
  for (const p of all) perAuthor.set(p.by, (perAuthor.get(p.by) ?? 0) + 1);
  const authors = [...perAuthor.entries()]
    .sort((a, b) => Number(isMe(b[0])) - Number(isMe(a[0])) || b[1] - a[1])
    .map(([by, n]) => ({ by, n }));

  // 고른 사람이 사진을 다 지웠으면 다시 모두로
  const current =
    filter !== 'all' && !authors.some((a) => a.by === filter) ? 'all' : filter;
  const photos = useMemo(
    () => (current === 'all' ? all : all.filter((p) => p.by === current)),
    [all, current]
  );

  const rows = useMemo(() => {
    const list: Row[] = [];
    for (const { month, photos: inMonth } of albumMonths(photos)) {
      const day = dayjs(`${month}-01`);
      list.push({
        type: 'month',
        key: `m-${month}`,
        label: day.isSame(dayjs(), 'year')
          ? day.format('M월')
          : day.format('YYYY년 M월'),
        count: inMonth.length,
      });
      for (let i = 0; i < inMonth.length; i += COLUMNS) {
        list.push({
          type: 'photos',
          key: `p-${month}-${i}`,
          photos: inMonth.slice(i, i + COLUMNS),
        });
      }
    }
    return list;
  }, [photos]);

  const title = together ? '우리 사진' : '내 사진';
  const cell = Math.floor((width - SIDE * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
  const label = (by: string | null) => (by === null ? '함께' : member(by).name);

  const open = (photo: AlbumPhoto) =>
    openPhotoViewer(
      photos.map((p) => ({
        uri: p.uri,
        path: p.path,
        caption: p.by
          ? `${p.item.title} · ${member(p.by).name}의 사진`
          : p.item.title,
        itemId: p.item.id,
        by: p.by,
        link: true,
      })),
      photos.indexOf(photo)
    );

  if (all.length === 0) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <NavBar title={title} />
        {sync.kind !== 'ok' ? (
          <SyncEmpty sync={sync} />
        ) : (
          <EmptyState
            title="아직 올린 사진이 없어요"
            description="기록을 남길 때 사진을 올리면 여기에 모여요."
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <NavBar title={`${title} · ${all.length}장`} />
      <FlatList
        data={rows}
        keyExtractor={(row) => row.key}
        contentContainerStyle={{ paddingHorizontal: SIDE, paddingBottom: 40 }}
        ListHeaderComponent={
          authors.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2 pb-1"
            >
              <Chip
                label={`전체 ${all.length}`}
                active={current === 'all'}
                onPress={() => setFilter('all')}
              />
              {authors.map(({ by, n }) => (
                <Chip
                  key={by ?? 'shared'}
                  label={`${label(by)} ${n}`}
                  active={current === by}
                  onPress={() => setFilter(by)}
                />
              ))}
            </ScrollView>
          ) : undefined
        }
        renderItem={({ item: row }) =>
          row.type === 'month' ? (
            <View className="flex-row items-baseline gap-1.5 pb-2 pt-5">
              <Text weight="700" size={15}>
                {row.label}
              </Text>
              <Text variant="muted" size={12}>
                {`${row.count}장`}
              </Text>
            </View>
          ) : (
            <View className="flex-row" style={{ gap: GAP, marginBottom: GAP }}>
              {row.photos.map((photo, i) => (
                <AlbumCell
                  key={`${photoKey(photo)}-${i}`}
                  photo={photo}
                  size={cell}
                  likes={likes.countOf(photo.path)}
                  onPress={() => open(photo)}
                />
              ))}
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

/** 사진 한 칸 (정사각형). 하트가 있으면 오른쪽 아래에 수 */
function AlbumCell({
  photo,
  size,
  likes,
  onPress,
}: {
  photo: AlbumPhoto;
  size: number;
  likes: number;
  onPress: () => void;
}) {
  const uri = usePhotoSource(photo.uri, photo.path);
  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel={`${photo.item.title} 사진 크게 보기`}
      onPress={onPress}
      className="overflow-hidden rounded-md bg-accent active:opacity-70"
      style={{ width: size, height: size }}
    >
      <Image
        source={uri ? { uri } : undefined}
        style={{ width: size, height: size }}
        contentFit="cover"
        transition={120}
      />
      <View className="absolute bottom-1 right-1" pointerEvents="none">
        <LikeCount count={likes} small />
      </View>
    </Pressable>
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
