import { backupLocal } from '@/components/space/spaceFlow';
import { useBucketStore } from '@/store/useBucketStore';
import { type Space, useSpaceStore } from '@/store/useSpaceStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// 서버 연결은 만들지 않는다 (백업 동작이 무엇을 부르는지만 본다)
jest.mock('@/lib/supabase/client', () => ({
  isSupabaseConfigured: false,
  supabase: {},
}));

const space = (id: string, personal: boolean) =>
  ({ id, name: id, is_personal: personal }) as Space;

/** 서버를 부르는 동작을 가짜로 바꾸고, 무엇을 불렀는지 돌려준다 */
function fake(spaces: Space[]) {
  const createSpace = jest.fn(async () => space('new', true));
  const moveLocalTo = jest.fn(async () => {});
  const switchSpace = jest.fn(async () => {});
  useSpaceStore.setState({ spaces, createSpace });
  useBucketStore.setState({ moveLocalTo, switchSpace });
  return { createSpace, moveLocalTo, switchSpace };
}

describe("'나만 보기' 백업", () => {
  it('개인 공간이 없으면 하나 만들어 거기로 옮기고, 그 공간으로 넘어간다', async () => {
    const calls = fake([space('shared', false)]);
    await backupLocal();
    expect(calls.createSpace).toHaveBeenCalledTimes(1);
    expect(calls.moveLocalTo).toHaveBeenCalledWith('new');
    expect(calls.switchSpace).toHaveBeenCalledWith('new');
  });

  it('개인 공간이 이미 있으면 새로 만들지 않고 그 공간에 올린다 (다시 눌러도 공간이 늘지 않는다)', async () => {
    const calls = fake([space('shared', false), space('mine', true)]);
    await backupLocal();
    expect(calls.createSpace).not.toHaveBeenCalled();
    expect(calls.moveLocalTo).toHaveBeenCalledWith('mine');
  });

  it('올리다 실패하면 공간을 바꾸지 않는다 (나만 보기에 그대로 남는다)', async () => {
    const calls = fake([space('mine', true)]);
    calls.moveLocalTo.mockRejectedValueOnce(new Error('offline'));
    await expect(backupLocal()).rejects.toThrow('offline');
    expect(calls.switchSpace).not.toHaveBeenCalled();
  });
});
