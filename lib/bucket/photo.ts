import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

const PHOTO_DIR = 'photos';

/**
 * 앨범에서 사진 1장을 고른다. 고른 파일은 임시 폴더에 있어 지워질 수 있으므로
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
    quality: 0.8,
  });
  if (result.canceled) return null;

  const source = new File(result.assets[0].uri);
  const folder = new Directory(Paths.document, PHOTO_DIR);
  folder.create({ idempotent: true, intermediates: true });

  const ext = source.extension || '.jpg';
  const target = new File(folder, `${Date.now()}${ext}`);
  await source.copy(target, { overwrite: true });
  return target.uri;
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
