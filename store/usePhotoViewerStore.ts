import { router } from 'expo-router';
import { create } from 'zustand';

import type { RecordPhoto } from '@/lib/bucket/types';

/**
 * 크게 보기 화면에 넘기는 사진.
 * caption: 위에 보여줄 글 (올린 사람 이름 등)
 * itemId: 어느 기록 사진인지 (공간 사진이면 하트를 누를 수 있다)
 * by: 올린 사람 (하트 알림을 받는 사람)
 * link: 위에 '기록 보기'를 보여줄지 (그 기록 화면에서 연 게 아닐 때)
 */
export type ViewerPhoto = RecordPhoto & {
  caption?: string | null;
  itemId?: string;
  by?: string | null;
  link?: boolean;
};

type PhotoViewerState = {
  photos: ViewerPhoto[];
  /** 처음 보여줄 사진 */
  index: number;
};

/** 사진 크게 보기 화면이 보여줄 사진들 (화면 사이에 넘기려고만 쓴다. 폰에 저장하지 않는다) */
export const usePhotoViewerStore = create<PhotoViewerState>()(() => ({
  photos: [],
  index: 0,
}));

/** 사진을 눌렀을 때: 크게 보기 화면을 연다 */
export function openPhotoViewer(photos: ViewerPhoto[], index: number) {
  if (photos.length === 0) return;
  usePhotoViewerStore.setState({
    photos,
    index: Math.min(Math.max(index, 0), photos.length - 1),
  });
  router.push('/photo');
}
