import { toAiClass, toAiDrafts, toAiTodoTexts } from '@/lib/bucket/aiDraft';

describe('AI가 준 답 거르기', () => {
  it('종류에 없는 카테고리를 주면 기타로 담는다', () => {
    // cook(요리)은 도전의 카테고리라 탐방에는 없다
    expect(
      toAiClass({ kind: 'place', category: 'cook', setting: 'indoor' })
    ).toEqual({ kind: 'place', category: 'etc', setting: 'indoor' });
  });

  it('종류를 모르는 답은 쓰지 않는다', () => {
    expect(toAiClass({ kind: 'travel', category: 'trip' })).toBeNull();
    expect(toAiClass(null)).toBeNull();
    expect(toAiClass('place')).toBeNull();
  });

  it('이미 담아 둔 것과 서로 겹치는 것은 빼고 담는다', () => {
    const item = (title: string) => ({
      title,
      kind: 'place',
      category: 'trip',
      setting: 'outdoor',
    });
    const drafts = toAiDrafts(
      { items: [item('부산 여행'), item('경주 들르기'), item('경주  들르기')] },
      ['부산여행']
    );
    expect(drafts.map((d) => d.title)).toEqual(['경주 들르기']);
  });

  it('이름이 너무 길면 40자로 자르고, 이름이 없으면 뺀다', () => {
    const drafts = toAiDrafts({
      items: [
        { title: '가'.repeat(100), kind: 'activity', category: 'hobby' },
        { title: '   ', kind: 'activity', category: 'hobby' },
        { kind: 'activity', category: 'hobby' },
      ],
    });
    expect(drafts).toHaveLength(1);
    expect(drafts[0].title).toHaveLength(40);
  });

  it('답이 이상한 모양이면 아무것도 담지 않는다', () => {
    expect(toAiDrafts(null)).toEqual([]);
    expect(toAiDrafts({ items: 'x' })).toEqual([]);
    expect(toAiTodoTexts({ todos: null }, [], 30)).toEqual([]);
  });

  it('할 것은 이미 있는 것을 빼고 남은 자리만큼만 넣는다', () => {
    const raw = { todos: ['항공권 예매', '숙소 정하기', '렌터카 빌리기', 3] };
    expect(toAiTodoTexts(raw, ['항공권예매'], 30)).toEqual([
      '숙소 정하기',
      '렌터카 빌리기',
    ]);
    expect(toAiTodoTexts(raw, [], 1)).toEqual(['항공권 예매']);
    expect(toAiTodoTexts(raw, [], 0)).toEqual([]);
  });
});
