import {
  completeItems,
  parseStreamLine,
  splitLines,
} from '@/lib/bucket/aiStream';

const full = JSON.stringify({
  items: [
    { title: '경복궁 야간 개장', todos: ['예매하기', '한복 빌리기'] },
    { title: '을지로 "노포" 투어 {1탄}', todos: ['집 고르기 \\ 정하기'] },
    { title: '한강 피크닉', todos: [] },
  ],
});

describe('도착하는 중인 AI 답에서 완성된 항목 꺼내기', () => {
  it('아직 배열이 시작되지 않았으면 없다', () => {
    expect(completeItems('')).toEqual([]);
    expect(completeItems('{"it')).toEqual([]);
    expect(completeItems('{"items":')).toEqual([]);
  });

  it('닫힌 항목만 꺼내고, 쓰는 중인 마지막 항목은 건너뛴다', () => {
    const cut = full.indexOf('한강') + 2;
    const items = completeItems(full.slice(0, cut));
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ title: '경복궁 야간 개장' });
  });

  it('글자 안의 중괄호·따옴표·역슬래시는 구조로 세지 않는다', () => {
    const items = completeItems(full) as { title: string; todos: string[] }[];
    expect(items).toHaveLength(3);
    expect(items[1].title).toBe('을지로 "노포" 투어 {1탄}');
    expect(items[1].todos).toEqual(['집 고르기 \\ 정하기']);
  });

  it('한 글자씩 늘려 가도 항목 수가 줄지 않고 끝에는 전부 나온다', () => {
    let last = 0;
    for (let i = 0; i <= full.length; i++) {
      const count = completeItems(full.slice(0, i)).length;
      expect(count).toBeGreaterThanOrEqual(last);
      last = count;
    }
    expect(last).toBe(3);
  });
});

describe('서버가 보내는 줄 읽기', () => {
  it('다 온 줄과 남은 조각을 나눈다', () => {
    expect(splitLines('{"a":1}\n{"b":2}\n{"c"')).toEqual({
      lines: ['{"a":1}', '{"b":2}'],
      rest: '{"c"',
    });
    expect(splitLines('{"a":1}\n')).toEqual({ lines: ['{"a":1}'], rest: '' });
  });

  it('줄의 뜻을 읽고, 모르는 줄은 버린다', () => {
    expect(parseStreamLine('{"stage":"writing"}')).toEqual({
      stage: 'writing',
    });
    expect(parseStreamLine('{"text":"{\\"items\\""}')).toEqual({
      text: '{"items"',
    });
    expect(parseStreamLine('{"done":true}')).toEqual({ done: true });
    expect(
      parseStreamLine('{"error":"ai_failed","reason":"max_tokens"}')
    ).toEqual({ error: 'ai_failed', reason: 'max_tokens' });
    expect(parseStreamLine('{"stage":"other"}')).toBeNull();
    expect(parseStreamLine('not json')).toBeNull();
  });
});
