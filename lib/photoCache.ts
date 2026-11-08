import { Image, type ImageSource } from 'expo-image';
import { Platform } from 'react-native';

import { getPhotoUrls } from '@/lib/supabase/bucketRemote';

/** 저장소 경로 → 보여줄 주소 (앱이 켜져 있는 동안 다시 쓰고, 50분 뒤 새로 받는다) */
const urlCache = new Map<string, { url: string; expiresAt: number }>();
const CACHE_MS = 50 * 60 * 1000;
/** 임시 링크 → 저장소 경로. 사진 파일을 링크가 아니라 경로로 폰에 저장하려고 */
const pathOfUrl = new Map<string, string>();

/**
 * 서버 사진을 보여줄 주소.
 * 폰에 저장해 둔 사진이면 그 파일을(인터넷 없이 바로), 아니면 임시 링크를 받는다.
 * 임시 링크는 화면이 한꺼번에 부르면 한 번에 모아서 받는다
 */
export async function loadPhotoUrl(path: string) {
  const cached = urlCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  const saved = await savedPhotoFile(path);
  const url = saved ?? (await requestSignedUrl(path));
  if (!saved) pathOfUrl.set(url, path);
  urlCache.set(path, { url, expiresAt: Date.now() + CACHE_MS });
  return url;
}

/** 받아 둔 주소를 잊는다 (못 불러왔을 때 다시 시도하면 서버에서 새로 받게) */
export function forgetPhotoUrl(path: string | null | undefined) {
  if (path) urlCache.delete(path);
}

/** 전에 본 사진이 폰에 저장돼 있으면 그 파일 주소 */
async function savedPhotoFile(path: string) {
  if (Platform.OS === 'web') return null;
  try {
    const file = await Image.getCachePathAsync(path);
    if (!file) return null;
    return file.startsWith('/') ? `file://${file}` : file;
  } catch {
    return null;
  }
}

/** 같은 순간에 부른 경로들을 모아 한 번에 임시 링크를 받는다 */
let waiting = new Map<
  string,
  { resolve: (url: string) => void; reject: (e: unknown) => void }[]
>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function requestSignedUrl(path: string) {
  return new Promise<string>((resolve, reject) => {
    const list = waiting.get(path) ?? [];
    list.push({ resolve, reject });
    waiting.set(path, list);
    flushTimer ??= setTimeout(() => void flushSignedUrls(), 30);
  });
}

async function flushSignedUrls() {
  const batch = waiting;
  waiting = new Map();
  flushTimer = null;
  try {
    const urls = await getPhotoUrls([...batch.keys()]);
    for (const [path, list] of batch) {
      const url = urls.get(path);
      for (const w of list) {
        if (url) w.resolve(url);
        else w.reject(new Error('photo_url_missing'));
      }
    }
  } catch (e) {
    for (const list of batch.values()) for (const w of list) w.reject(e);
  }
}

/**
 * Image에 넘길 사진 주소. 임시 링크면 저장소 경로를 저장 이름으로 써서,
 * 링크가 바뀌어도 한 번 받은 사진을 다시 받지 않는다
 */
export function photoImageSource(
  uri: string | null | undefined
): ImageSource | undefined {
  if (!uri) return undefined;
  const cacheKey = pathOfUrl.get(uri);
  return cacheKey ? { uri, cacheKey } : { uri };
}

/** 이 폰에 저장해 둔 다른 사람 사진·링크를 모두 지운다 (공간을 나가거나 로그아웃할 때) */
export async function clearSavedPhotos() {
  urlCache.clear();
  pathOfUrl.clear();
  await Promise.all([
    Image.clearMemoryCache().catch(() => false),
    Image.clearDiskCache().catch(() => false),
  ]);
}
