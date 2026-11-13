import { isServerRejection } from '@/lib/connection';
import type { BucketItem } from '@/lib/bucket/types';
import * as remote from '@/lib/supabase/bucketRemote';
import { useBucketStore } from '@/store/useBucketStore';
import { pendingFor, useOutboxStore } from '@/store/useOutboxStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@/lib/supabase/client', () => ({
  isSupabaseConfigured: false,
  supabase: {},
}));
jest.mock('@/lib/push', () => ({ notifySpace: jest.fn() }));
// 서버에 올리는 부분만 가짜로 바꾼다
jest.mock('@/lib/supabase/bucketRemote', () => ({
  ...jest.requireActual('@/lib/supabase/bucketRemote'),
  upsertItems: jest.fn(),
  updateItemFields: jest.fn(),
}));

const upsertItems = remote.upsertItems as jest.Mock;
const updateItemFields = remote.updateItemFields as jest.Mock;

const SPACE = 'space-1';
const ID = '00000000-0000-4000-8000-000000000001';
const item = (over: Partial<BucketItem> = {}): BucketItem => ({
  id: ID,
  kind: 'place',
  title: '남산타워',
  category: 'culture',
  setting: 'outdoor',
  location: '',
  memo: '',
  createdAt: '2026-11-13T00:00:00.000Z',
  done: null,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  upsertItems.mockResolvedValue(undefined);
  updateItemFields.mockResolvedValue(undefined);
  useOutboxStore.getState().clear();
  useBucketStore.setState({ spaceId: SPACE, items: [item()], cache: {} });
});

describe('바뀐 칸만 올리기', () => {
  it('메모만 고쳤으면 서버에 메모만 보낸다 (상대가 남긴 기록을 덮어쓰지 않는다)', async () => {
    useBucketStore
      .getState()
      .updateItem(ID, { memo: '예약 필수', title: '남산타워' });
    await useBucketStore.getState().flushPending();

    expect(upsertItems).not.toHaveBeenCalled();
    expect(updateItemFields).toHaveBeenCalledTimes(1);
    // 제목은 넘겼지만 안 바뀌었으니 보내지 않는다
    expect(updateItemFields.mock.calls[0][2]).toEqual(['memo']);
  });

  it('새로 담은 항목은 통째로 올리고, 올라가기 전에 고쳐도 통째로 올린다', async () => {
    useBucketStore.setState({ items: [] });
    const [id] = useBucketStore.getState().addItems([item()]);
    useBucketStore.getState().updateItem(id, { memo: '고침' });
    await useBucketStore.getState().flushPending();

    expect(updateItemFields).not.toHaveBeenCalled();
    // 담자마자 한 번, 고친 뒤 한 번 올라갈 수 있다. 마지막에 올라간 것이 고친 내용이다
    expect(upsertItems).toHaveBeenCalled();
    expect(upsertItems.mock.calls.at(-1)[0][0].memo).toBe('고침');
  });

  it('서버에서 새로 받을 때, 안 올라간 내 칸만 폰 것을 쓰고 나머지는 서버 것을 쓴다', () => {
    const server = item({ memo: '서버 메모', title: '상대가 고친 제목' });
    const mine = item({ memo: '내가 고친 메모', title: '예전 제목' });
    expect(remote.overlayFields(server, mine, ['memo'])).toEqual(
      item({ memo: '내가 고친 메모', title: '상대가 고친 제목' })
    );
  });

  it('올릴 행에서 바뀐 칸만 남기고, 할 것은 통째로 올리기로 했을 때만 넣는다', () => {
    const row = { id: ID, title: 't', memo: 'm', todos: [], created_at: 'x' };
    expect(remote.pickRowFields(row, ['memo', 'created_at'], false)).toEqual({
      memo: 'm',
    });
    expect(remote.pickRowFields(row, [], true)).toEqual({ todos: [] });
  });

  it('여러 번 고치면 바뀐 칸이 모인다', () => {
    const outbox = useOutboxStore.getState();
    outbox.queueUpsert(SPACE, ['a'], undefined, false, ['memo']);
    outbox.queueUpsert(SPACE, ['a'], undefined, false, ['title', 'memo']);
    expect(pendingFor(SPACE).upsertFields.get('a')).toEqual(['memo', 'title']);
  });
});

describe('올리다 실패했을 때', () => {
  it('서버가 잠깐 안 되면(503) 변경을 버리지 않고 대기열에 둔다', async () => {
    updateItemFields.mockRejectedValue({ status: 503, message: 'unavailable' });
    useBucketStore.getState().updateItem(ID, { memo: '예약 필수' });
    await useBucketStore.getState().flushPending();

    expect(pendingFor(SPACE).upserts.has(ID)).toBe(true);
  });

  it('서버가 거절하면(권한 없음) 대기열에서 뺀다', async () => {
    updateItemFields.mockRejectedValue({ code: '42501', message: 'denied' });
    useBucketStore.getState().updateItem(ID, { memo: '예약 필수' });
    await useBucketStore.getState().flushPending();

    expect(pendingFor(SPACE).upserts.has(ID)).toBe(false);
  });

  it('거절과 잠깐 안 되는 것을 구분한다', () => {
    // 거절: 권한 없음, 잘못된 값, 400대
    expect(isServerRejection({ code: '42501' })).toBe(true);
    expect(isServerRejection({ code: '23514' })).toBe(true);
    expect(isServerRejection({ status: 403 })).toBe(true);
    // 잠깐 안 됨: 서버 오류, 너무 많은 요청, 로그인 만료, 연결·시간 초과, 인터넷, 모르는 오류
    expect(isServerRejection({ status: 503 })).toBe(false);
    expect(isServerRejection({ status: 429 })).toBe(false);
    expect(isServerRejection({ code: 'PGRST301', status: 401 })).toBe(false);
    expect(isServerRejection({ code: '57014' })).toBe(false);
    expect(isServerRejection({ code: 'PGRST002' })).toBe(false);
    expect(isServerRejection(new Error('Network request failed'))).toBe(false);
    expect(isServerRejection(new Error('something odd'))).toBe(false);
  });
});
