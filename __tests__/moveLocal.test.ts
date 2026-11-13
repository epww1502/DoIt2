import type { BucketItem } from '@/lib/bucket/types';
import * as remote from '@/lib/supabase/bucketRemote';
import { useBucketStore } from '@/store/useBucketStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@/lib/supabase/client', () => ({
  isSupabaseConfigured: false,
  supabase: {},
}));
// 서버에 올리는 부분만 가짜로 바꾼다
jest.mock('@/lib/supabase/bucketRemote', () => ({
  ...jest.requireActual('@/lib/supabase/bucketRemote'),
  uploadPhoto: jest.fn(),
  upsertItems: jest.fn(),
  upsertReview: jest.fn(),
}));

const uploadPhoto = remote.uploadPhoto as jest.Mock;
const upsertItems = remote.upsertItems as jest.Mock;

const item = (id: string, photoUri?: string): BucketItem => ({
  // 끝자리만 다른 UUID
  id: `00000000-0000-4000-8000-00000000000${id}`,
  kind: 'place',
  title: `항목 ${id}`,
  category: 'food',
  setting: 'indoor',
  location: '',
  memo: '',
  createdAt: '2026-11-13T00:00:00.000Z',
  done: null,
  photos: photoUri ? [{ uri: photoUri, path: null }] : [],
});

beforeEach(() => {
  jest.clearAllMocks();
  upsertItems.mockResolvedValue(undefined);
  useBucketStore.setState({ spaceId: null, items: [], cache: {} });
});

describe("'나만 보기'를 공간으로 옮기기", () => {
  it('사진을 하나라도 못 올리면 멈추고, 나만 보기에 그대로 둔다', async () => {
    const local = [item('1'), item('2', 'file://photo.jpg')];
    useBucketStore.setState({ items: local });
    uploadPhoto.mockRejectedValue(new Error('upload failed'));

    await expect(
      useBucketStore.getState().moveLocalTo('space-1')
    ).rejects.toThrow('사진을 올리지 못했어요');

    // 사진 없이 올리지도, 폰에서 지우지도 않는다
    expect(upsertItems).not.toHaveBeenCalled();
    expect(useBucketStore.getState().items).toEqual(local);
  });

  it('사진까지 다 올라가면 옮긴 것을 나만 보기에서 뺀다', async () => {
    useBucketStore.setState({ items: [item('1', 'file://photo.jpg')] });
    uploadPhoto.mockResolvedValue('space-1/photo.jpg');

    await useBucketStore.getState().moveLocalTo('space-1');

    expect(upsertItems).toHaveBeenCalledTimes(1);
    expect(upsertItems.mock.calls[0][0][0].photos[0].path).toBe(
      'space-1/photo.jpg'
    );
    expect(useBucketStore.getState().items).toEqual([]);
  });

  it('올리는 동안 새로 담은 것은 지우지 않는다', async () => {
    useBucketStore.setState({ items: [item('1')] });
    const late = item('9');
    // 서버에 올리는 사이에 하나를 더 담는다
    upsertItems.mockImplementation(async () => {
      useBucketStore.setState({
        items: [late, ...useBucketStore.getState().items],
      });
    });

    await useBucketStore.getState().moveLocalTo('space-1');

    expect(useBucketStore.getState().items).toEqual([late]);
  });

  it('올리는 동안 다른 공간으로 바꿨어도 그 공간 목록은 그대로다', async () => {
    const local = [item('1')];
    const other = [item('5')];
    useBucketStore.setState({ items: local });
    upsertItems.mockImplementation(async () => {
      // '나만 보기'는 저장해 두고 다른 공간을 보고 있는 상태
      useBucketStore.setState({
        spaceId: 'space-2',
        items: other,
        cache: { local },
      });
    });

    await useBucketStore.getState().moveLocalTo('space-1');

    expect(useBucketStore.getState().items).toEqual(other);
    expect(useBucketStore.getState().cache.local).toEqual([]);
  });
});
