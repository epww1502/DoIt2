import { pendingFor, useOutboxStore } from '@/store/useOutboxStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const SPACE = 'space-1';

beforeEach(() => {
  useOutboxStore.getState().clear();
});

describe('오프라인 대기열', () => {
  it('항목 변경과 내 평가는 따로 쌓인다', () => {
    const outbox = useOutboxStore.getState();
    outbox.queueUpsert(SPACE, ['a'], 'added');
    outbox.queueReview(SPACE, 'a', 'done');
    const { upserts, reviews, deletes } = pendingFor(SPACE);
    expect([...upserts]).toEqual(['a']);
    expect([...reviews]).toEqual(['a']);
    expect(deletes.size).toBe(0);
  });

  it("처음 담은 알림('added')은 다시 고쳐도 남는다", () => {
    const outbox = useOutboxStore.getState();
    outbox.queueUpsert(SPACE, ['a'], 'added');
    outbox.queueUpsert(SPACE, ['a']);
    const entry = Object.values(useOutboxStore.getState().entries)[0];
    expect(entry.notify).toBe('added');
  });

  it('올리는 사이에 또 바뀌었으면 settle해도 남긴다', () => {
    const outbox = useOutboxStore.getState();
    outbox.queueUpsert(SPACE, ['a']);
    const sending = Object.values(useOutboxStore.getState().entries)[0];
    // 올리는 동안 다시 고침
    outbox.queueUpsert(SPACE, ['a']);
    useOutboxStore.getState().settle([sending]);
    expect(pendingFor(SPACE).upserts.has('a')).toBe(true);
    // 최신 것을 올리면 빠진다
    const latest = Object.values(useOutboxStore.getState().entries)[0];
    useOutboxStore.getState().settle([latest]);
    expect(pendingFor(SPACE).upserts.has('a')).toBe(false);
  });

  it('지우면 그 항목의 평가 대기도 같이 빠진다', () => {
    const outbox = useOutboxStore.getState();
    outbox.queueReview(SPACE, 'a');
    outbox.queueDelete(SPACE, ['a']);
    const { reviews, deletes } = pendingFor(SPACE);
    expect(reviews.has('a')).toBe(false);
    expect(deletes.has('a')).toBe(true);
  });

  it('나간 공간의 변경은 버린다', () => {
    const outbox = useOutboxStore.getState();
    outbox.queueUpsert(SPACE, ['a']);
    outbox.queueUpsert('space-2', ['b']);
    outbox.dropSpace(SPACE);
    expect(pendingFor(SPACE).upserts.size).toBe(0);
    expect(pendingFor('space-2').upserts.has('b')).toBe(true);
  });
});
