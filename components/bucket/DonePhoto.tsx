import { Image, type ImageStyle } from 'expo-image';
import { ImageOff, Images } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
} from 'react-native';

import { Icon, Text } from '@/components/atoms';
import {
  recordPhotos,
  type DoneRecord,
  type RecordPhoto,
} from '@/lib/bucket/types';
import { noteFailure } from '@/lib/connection';
import { cn } from '@/lib/utils';
import { getPhotoUrl } from '@/lib/supabase/bucketRemote';

/** 저장소 경로 → 임시 링크 (앱이 켜져 있는 동안 다시 쓰고, 50분 뒤 새로 받는다) */
const urlCache = new Map<string, { url: string; expiresAt: number }>();
const CACHE_MS = 50 * 60 * 1000;

async function loadPhotoUrl(path: string) {
  const cached = urlCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  const url = await getPhotoUrl(path);
  urlCache.set(path, { url, expiresAt: Date.now() + CACHE_MS });
  return url;
}

/**
 * 함께한 기록 사진의 주소. 이 휴대폰에 파일이 있으면 그 파일을,
 * 없으면(상대가 올린 사진) 서버 임시 링크를 쓴다.
 * failed: 링크를 받지 못했다 (retry로 다시 받는다)
 */
export function usePhotoState(
  photoUri: string | null | undefined,
  photoPath: string | null | undefined
) {
  // 어느 경로의 링크인지 같이 들고 있어야, 경로가 바뀌었을 때 예전 사진을 안 보여준다
  const [remote, setRemote] = useState<{ path: string; url: string } | null>(
    null
  );
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (photoUri || !photoPath) return;
    let cancelled = false;
    loadPhotoUrl(photoPath)
      .then((url) => {
        if (cancelled) return;
        setRemote({ path: photoPath, url });
        setFailedPath(null);
      })
      .catch((e: unknown) => {
        noteFailure(e);
        if (!cancelled) setFailedPath(photoPath);
      });
    return () => {
      cancelled = true;
    };
  }, [photoUri, photoPath, attempt]);

  const retry = () => {
    setFailedPath(null);
    setAttempt((n) => n + 1);
  };

  if (photoUri) return { uri: photoUri, failed: false, retry };
  return {
    uri: remote && remote.path === photoPath ? remote.url : null,
    failed: Boolean(photoPath) && failedPath === photoPath,
    retry,
  };
}

/** 사진 주소만 필요할 때 (못 받으면 null) */
export function usePhotoSource(
  photoUri: string | null | undefined,
  photoPath: string | null | undefined
) {
  return usePhotoState(photoUri, photoPath).uri;
}

type DonePhotoProps = {
  done: Pick<DoneRecord, 'photoUri' | 'photoPath' | 'photos'>;
  style?: StyleProp<ImageStyle>;
};

/** 첫 번째 사진을 4:3으로. 여러 장이면 오른쪽 위에 장 수를 보여준다. 없으면 그리지 않는다 */
export function DonePhoto({ done, style }: DonePhotoProps) {
  const photos = recordPhotos(done);
  if (photos.length === 0) return null;
  return (
    <View>
      <PhotoImage photo={photos[0]} style={style} />
      {photos.length > 1 ? (
        <View className="absolute right-3 top-3 flex-row items-center gap-1 rounded-full bg-black/60 px-2.5 py-1">
          <Icon as={Images} size={13} className="text-white" />
          <Text size={12} weight="600" className="text-white">
            {photos.length}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** 사진 여러 장을 옆으로 넘겨 본다 (아래에 점으로 몇 번째인지) */
export function DonePhotoGallery({ done }: Pick<DonePhotoProps, 'done'>) {
  const photos = recordPhotos(done);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  if (photos.length === 0) return null;
  if (photos.length === 1) return <PhotoImage photo={photos[0]} />;

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width > 0) {
      setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
    }
  };

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
      >
        {photos.map((photo, i) => (
          <PhotoImage
            key={photo.path ?? photo.uri ?? i}
            photo={photo}
            style={{ width: width || 1 }}
          />
        ))}
      </ScrollView>
      <View className="absolute bottom-3 left-0 right-0 flex-row justify-center gap-1.5">
        {photos.map((photo, i) => (
          <View
            key={photo.path ?? photo.uri ?? i}
            className={cn(
              'h-1.5 rounded-full',
              i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
            )}
          />
        ))}
      </View>
    </View>
  );
}

/** 사진 한 장 (4:3) */
export function PhotoImage({
  photo,
  style,
}: {
  photo: RecordPhoto;
  style?: StyleProp<ImageStyle>;
}) {
  const { uri, failed, retry } = usePhotoState(photo.uri, photo.path);
  // 링크는 받았는데 사진 파일을 못 내려받은 경우
  const [brokenUri, setBrokenUri] = useState<string | null>(null);

  if (failed || (uri && brokenUri === uri)) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="사진 다시 불러오기"
        onPress={() => {
          setBrokenUri(null);
          retry();
        }}
        className="items-center justify-center gap-1.5 bg-accent active:opacity-70"
        style={[{ width: '100%', aspectRatio: 4 / 3 }, style as object]}
      >
        <Icon as={ImageOff} size={24} className="text-muted-foreground" />
        <Text size={12} className="text-muted-foreground">
          사진을 불러오지 못했어요 · 눌러서 다시 시도
        </Text>
      </Pressable>
    );
  }

  return (
    <Image
      source={uri ? { uri } : undefined}
      style={[{ width: '100%', aspectRatio: 4 / 3 }, style]}
      contentFit="cover"
      transition={150}
      onError={() => setBrokenUri(uri)}
    />
  );
}
