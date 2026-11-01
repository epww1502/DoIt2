import { applyTodoOps, type ItemTodo } from '@/lib/bucket/types';
import { pendingFor, useOutboxStore } from '@/store/useOutboxStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const SPACE = 'space-1';
const todo = (id: string, done = false): ItemTodo => ({
  id,
  text: id,
  done,
});

beforeEach(() => {
  useOutboxStore.getState().clear();
});

describe('할 것 변경', () => {
  it('두 사람이 다른 할 것을 체크해도 둘 다 남는다', () => {
    const server = [todo('a'), todo('b')];
    // 나는 a, 상대는 b를 체크 (어느 쪽이 먼저 반영되든 같은 결과)
    const mineFirst = applyTodoOps(
      applyTodoOps(server, [{ type: 'check', todoId: 'a', done: true }]),
      [{ type: 'check', todoId: 'b', done: true }]
    );
    expect(mineFirst.map((t) => t.done)).toEqual([true, true]);
  });

  it('같은 변경을 두 번 보내도 결과가 같다', () => {
    const ops = [
      { type: 'check', todoId: 'a', done: true },
      { type: 'add', todo: todo('c') },
    ] as const;
    const once = applyTodoOps([todo('a')], [...ops]);
    const twice = applyTodoOps(once, [...ops]);
    expect(twice).toEqual(once);
    expect(twice.map((t) => t.id)).toEqual(['a', 'c']);
  });

  it('없는 할 것을 체크하면 아무것도 안 바뀐다', () => {
    const list = [todo('a')];
    expect(
      applyTodoOps(list, [{ type: 'check', todoId: 'x', done: true }])
    ).toEqual(list);
  });

  it('대기열에 차례대로 쌓이고, 항목을 지우면 같이 빠진다', () => {
    const outbox = useOutboxStore.getState();
    outbox.queueTodoOps(SPACE, 'item', [
      { type: 'check', todoId: 'a', done: true },
    ]);
    outbox.queueTodoOps(SPACE, 'item', [
      { type: 'check', todoId: 'a', done: false },
    ]);
    const ops = pendingFor(SPACE).todoOps.get('item');
    expect(ops?.map((o) => o.type === 'check' && o.done)).toEqual([
      true,
      false,
    ]);
    // 항목 변경 대기와는 따로 센다
    expect(pendingFor(SPACE).upserts.size).toBe(0);

    outbox.queueDelete(SPACE, ['item']);
    expect(pendingFor(SPACE).todoOps.size).toBe(0);
  });

  it('할 것을 통째로 올리기로 한 표시는 다시 고쳐도 남는다', () => {
    const outbox = useOutboxStore.getState();
    outbox.queueUpsert(SPACE, ['a'], undefined, true);
    outbox.queueUpsert(SPACE, ['a']);
    const entry = Object.values(useOutboxStore.getState().entries)[0];
    expect(entry.withTodos).toBe(true);
  });
});
