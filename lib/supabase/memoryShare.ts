/**
 * 추억 공유: 한 해 돌아보기의 사본과 고른 사진을 서버에 올리고 웹 링크를 만든다.
 * 사진은 공개 저장소('shared')에 다시 저장해서 올린다 (원본 사진은 그대로 비공개).
 */
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import {
  memoryLink,
  memoryTitle,
  type MemoryPayload,
} from '@/lib/bucket/memoryShare';
import type { RecordPhoto } from '@/lib/bucket/types';
import { loadPhotoUrl } from '@/lib/photoCache';

import { supabase } from './client';
import type { Json } from './database.types';

const SHARED_BUCKET = 'shared';
const SHARED_COMPRESS = 0.8;

export type MemoryShare = {
  id: string;
  title: string;
  year: number;
  photoCount: number;
  createdAt: string;
  link: string;
};

/** 사진을 이 폰의 파일로 (상대가 올린 사진은 내려받는다) */
async function localPhotoFile(photo: RecordPhoto, index: number) {
  if (photo.uri) return photo.uri;
  if (!photo.path) throw new Error('no photo');
  const url = await loadPhotoUrl(photo.path);
  if (url.startsWith('file:')) return url;
  const folder = new Directory(Paths.cache, 'memory-share');
  folder.create({ idempotent: true, intermediates: true });
  const target = new File(folder, `${index}.jpg`);
  const file = await File.downloadFileAsync(url, target, { idempotent: true });
  return file.uri;
}

/** JPEG로 다시 저장한다. 촬영 위치 같은 사진 정보(EXIF)가 빠진다 */
async function reencode(uri: string) {
  const image = await ImageManipulator.manipulate(uri).renderAsync();
  const saved = await image.saveAsync({
    compress: SHARED_COMPRESS,
    format: SaveFormat.JPEG,
  });
  return saved.uri;
}

function removeTemp(uri: string) {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // 임시 파일이라 못 지워도 괜찮다
  }
}

/**
 * 링크 만들기. 사진을 한 장이라도 못 올리면 만든 것을 되돌리고 던진다.
 * onProgress: 사진을 몇 장 올렸는지
 */
export async function createMemoryShare(
  year: number,
  payload: MemoryPayload,
  photos: RecordPhoto[],
  onProgress?: (uploaded: number) => void
): Promise<MemoryShare> {
  const title = memoryTitle(payload.space, year);
  const { data: id, error } = await supabase.rpc('create_shared_memory', {
    memory_title: title,
    memory_year: year,
    memory_payload: payload as unknown as Json,
  });
  if (error || !id) {
    throw new Error(
      error?.message.includes('too_many_shares')
        ? '켜 둔 링크가 너무 많아요. 안 쓰는 링크를 끄고 다시 해주세요.'
        : '링크를 만들지 못했어요. 잠시 후 다시 시도해주세요.'
    );
  }

  try {
    for (let i = 0; i < photos.length; i++) {
      const source = await localPhotoFile(photos[i], i);
      const jpeg = await reencode(source);
      try {
        const { error: uploadError } = await supabase.storage
          .from(SHARED_BUCKET)
          .upload(
            `${id}/${payload.photos[i].file}`,
            await new File(jpeg).arrayBuffer(),
            {
              contentType: 'image/jpeg',
            }
          );
        if (uploadError) throw uploadError;
      } finally {
        removeTemp(jpeg);
      }
      onProgress?.(i + 1);
    }
  } catch (e) {
    console.warn('[memory-share] upload', e);
    await deleteMemoryShare(id).catch(() => {});
    throw new Error('사진을 올리지 못했어요. 잠시 후 다시 시도해주세요.');
  }

  return {
    id,
    title,
    year,
    photoCount: photos.length,
    createdAt: new Date().toISOString(),
    link: memoryLink(id),
  };
}

/** 내가 켜 둔 링크들 (최근 것부터) */
export async function listMemoryShares(): Promise<MemoryShare[]> {
  const { data, error } = await supabase
    .from('shared_memories')
    .select('id, title, year, payload, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const photos = (row.payload as { photos?: unknown } | null)?.photos;
    return {
      id: row.id,
      title: row.title,
      year: row.year,
      photoCount: Array.isArray(photos) ? photos.length : 0,
      createdAt: row.created_at,
      link: memoryLink(row.id),
    };
  });
}

/** 링크 끄기: 올린 사진을 지우고 나서 링크를 지운다 (사진만 남는 일이 없게) */
export async function deleteMemoryShare(id: string) {
  const bucket = supabase.storage.from(SHARED_BUCKET);
  const { data: files, error: listError } = await bucket.list(id, {
    limit: 100,
  });
  if (listError) throw listError;
  const paths = (files ?? []).filter((f) => f.id).map((f) => `${id}/${f.name}`);
  if (paths.length > 0) {
    const { error: removeError } = await bucket.remove(paths);
    if (removeError) throw removeError;
  }
  const { error } = await supabase
    .from('shared_memories')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
