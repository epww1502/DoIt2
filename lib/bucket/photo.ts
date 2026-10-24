import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

const PHOTO_DIR = 'photos';

/**
 * 앨범에서 사진 1장을 고른다 (자르기 포함). 고른 파일은 임시 폴더에 있어 지워질 수 있으므로
 * 앱 문서 폴더로 복사한 뒤 그 uri를 돌려준다. 취소하면 null.
 */
export async function pickPhoto({
  aspect = [4, 3],
}: {
  /** 자르기 비율. 기록 사진은 4:3, 공간 아이콘은 1:1 */
  aspect?: [number, number];
} = {}): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect,
    quality: 1,
  });
  if (result.canceled) return null;
  return saveAsset(result.assets[0]);
}

/**
 * 앨범에서 사진을 여러 장 고른다 (자르기 없이). 앱 문서 폴더에 복사한 uri들.
 * 취소하면 빈 목록.
 */
export async function pickPhotos(limit: number): Promise<string[]> {
  if (limit <= 0) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: limit,
    orderedSelection: true,
    quality: 1,
  });
  if (result.canceled) return [];
  const uris: string[] = [];
  for (const asset of result.assets.slice(0, limit)) {
    uris.push(await saveAsset(asset));
  }
  return uris;
}

/** 고른 사진을 줄여서 앱 문서 폴더로 복사하고 그 uri를 돌려준다 */
async function saveAsset(asset: ImagePicker.ImagePickerAsset) {
  // 저장 공간·데이터를 아끼려고 긴 쪽 1280px, JPEG 0.7로 줄인다 (장당 수 MB → 200~300KB)
  const resized = await shrinkPhoto(asset.uri, asset.width, asset.height);

  const folder = new Directory(Paths.document, PHOTO_DIR);
  folder.create({ idempotent: true, intermediates: true });
  // 여러 장을 한 번에 저장해도 이름이 겹치지 않게 뒤에 무작위 글자를 붙인다
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const target = new File(folder, name);
  const source = new File(resized);
  await source.copy(target, { overwrite: true });
  // 줄이면서 만든 임시 파일은 지운다
  if (resized !== asset.uri) deletePhoto(resized);
  return target.uri;
}

/** 사진 긴 쪽 최대 길이(px)와 JPEG 압축률 */
const MAX_PHOTO_SIDE = 1280;
const PHOTO_COMPRESS = 0.7;

/** 긴 쪽이 MAX_PHOTO_SIDE를 넘으면 줄이고, JPEG로 압축한 임시 파일 uri */
async function shrinkPhoto(uri: string, width: number, height: number) {
  const context = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > MAX_PHOTO_SIDE) {
    context.resize(
      width >= height ? { width: MAX_PHOTO_SIDE } : { height: MAX_PHOTO_SIDE }
    );
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({
    compress: PHOTO_COMPRESS,
    format: SaveFormat.JPEG,
  });
  return saved.uri;
}

/** 앱 폴더에 복사해 둔 사진을 지운다. 이미 없으면 무시. */
export function deletePhoto(uri: string | null | undefined) {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // 지우기 실패는 치명적이지 않아서 무시
  }
}
