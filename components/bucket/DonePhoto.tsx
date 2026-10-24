import { Image, type ImageStyle } from 'expo-image';
import { useEffect, useState } from 'react';
import type { StyleProp } from 'react-native';

import type { DoneRecord } from '@/lib/bucket/types';
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
 */
export function usePhotoSource(
  photoUri: string | null | undefined,
  photoPath: string | null | undefined
) {
  // 어느 경로의 링크인지 같이 들고 있어야, 경로가 바뀌었을 때 예전 사진을 안 보여준다
  const [remote, setRemote] = useState<{ path: string; url: string } | null>(
    null
  );

  useEffect(() => {
    if (photoUri || !photoPath) return;
    let cancelled = false;
    loadPhotoUrl(photoPath)
      .then((url) => {
        if (!cancelled) setRemote({ path: photoPath, url });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [photoUri, photoPath]);

  if (photoUri) return photoUri;
  return remote && remote.path === photoPath ? remote.url : null;
}

type DonePhotoProps = {
  done: Pick<DoneRecord, 'photoUri' | 'photoPath'>;
  style?: StyleProp<ImageStyle>;
};

/** 사진이 있으면 4:3으로 보여준다. 없으면 아무것도 그리지 않는다 */
export function DonePhoto({ done, style }: DonePhotoProps) {
  const uri = usePhotoSource(done.photoUri, done.photoPath);
  if (!done.photoUri && !done.photoPath) return null;
  return (
    <Image
      source={uri ? { uri } : undefined}
      style={[{ width: '100%', aspectRatio: 4 / 3 }, style]}
      contentFit="cover"
      transition={150}
    />
  );
}
