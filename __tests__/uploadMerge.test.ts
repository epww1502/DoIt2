import type { BucketItem } from '@/lib/bucket/types';
import { mergeUploadedItem } from '@/lib/bucket/uploadMerge';

const local = [{ uri: 'file:///a.jpg' }];
const withPath = [{ uri: 'file:///a.jpg', path: 'space/a.jpg' }];
const before = {
  id: '1',
  title: '바다 보러 가기',
  photos: local,
} as BucketItem;
const uploaded = { ...before, photos: withPath } as BucketItem;

describe('mergeUploadedItem', () => {
  it('uses the uploaded copy when nothing changed meanwhile', () => {
    expect(mergeUploadedItem(before, before, uploaded)).toBe(uploaded);
  });

  it('keeps an edit made during the upload and only adds the photo paths', () => {
    const latest = { ...before, title: '동해 보러 가기' } as BucketItem;
    const merged = mergeUploadedItem(latest, before, uploaded);
    expect(merged.title).toBe('동해 보러 가기');
    expect(merged.photos).toBe(withPath);
  });

  it('keeps the photos as they are when the photos themselves changed meanwhile', () => {
    const other = [{ uri: 'file:///b.jpg' }];
    const latest = { ...before, photos: other } as BucketItem;
    expect(mergeUploadedItem(latest, before, uploaded).photos).toBe(other);
  });
});
