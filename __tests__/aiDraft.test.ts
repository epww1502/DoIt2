import {
  pickAiPlace,
  toAiClass,
  toAiDrafts,
  toAiFill,
  toAiTodoTexts,
  toAiUsage,
} from '@/lib/bucket/aiDraft';

describe('AI가 준 답 거르기', () => {
  it('종류와 카테고리가 어긋나면 종류를 카테고리에 맞춘다', () => {
    // '요트 타기': 도전이라고 하면서 탐방의 액티비티를 준 경우
    expect(
      toAiClass({ kind: 'activity', category: 'activity', setting: 'outdoor' })
    ).toEqual({ kind: 'place', category: 'activity', setting: 'outdoor' });
    // cook(요리)은 도전의 카테고리
    expect(
      toAiClass({ kind: 'place', category: 'cook', setting: 'indoor' })
    ).toEqual({ kind: 'activity', category: 'cook', setting: 'indoor' });
  });

  it('기타나 모르는 카테고리면 종류는 그대로 두고 기타로 담는다', () => {
    expect(toAiClass({ kind: 'place', category: 'etc' })).toEqual({
      kind: 'place',
      category: 'etc',
      setting: 'indoor',
    });
    expect(toAiClass({ kind: 'activity', category: 'sports' })).toEqual({
      kind: 'activity',
      category: 'etc',
      setting: 'indoor',
    });
  });

  it('종류를 모르는 답은 쓰지 않는다', () => {
    expect(toAiClass({ kind: 'travel', category: 'sports' })).toBeNull();
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

  it('AI로 채우기: 장소를 못 찾았으면 빈 글자로, 분류를 못 했으면 그대로 두게 null로 준다', () => {
    expect(
      toAiFill(
        {
          kind: 'place',
          category: 'trip',
          setting: 'outdoor',
          place: ' 경복궁 ',
          location: '서울 종로구',
          todos: ['한복 빌리기', '한복 빌리기'],
        },
        [],
        30
      )
    ).toEqual({
      cls: { kind: 'place', category: 'trip', setting: 'outdoor' },
      placeQuery: '경복궁',
      location: '서울 종로구',
      todos: ['한복 빌리기'],
    });
    expect(toAiFill({ place: 3, todos: 'x' }, [], 30)).toEqual({
      cls: null,
      placeQuery: '',
      location: '',
      todos: [],
    });
  });

  it('사용량: 한도보다 많이 쓴 것으로 와도 남은 횟수는 0 아래로 내려가지 않는다', () => {
    const usage = toAiUsage({
      ai: { used: 25, limit: 20 },
      auto: { used: 3, limit: 60 },
    });
    expect(usage.ai).toEqual({ used: 20, limit: 20 });
    expect(usage.auto).toEqual({ used: 3, limit: 60 });
    expect(toAiUsage(null).ai).toEqual({ used: 0, limit: 0 });
  });

  it('장소는 이름이 맞는 곳만 붙이고, 이름이 다른 첫 결과는 붙이지 않는다', () => {
    const places = [{ name: '성수 파스타' }, { name: '롯데월드 어드벤처' }];
    expect(pickAiPlace(places, '롯데월드')).toEqual({
      name: '롯데월드 어드벤처',
    });
    // 검색 결과는 있지만 이름이 안 맞는다: 엉뚱한 곳에 핀을 찍지 않는다
    expect(pickAiPlace(places, '경복궁')).toBeNull();
    expect(pickAiPlace([], '경복궁')).toBeNull();
    expect(pickAiPlace(places, '  ')).toBeNull();
  });
});
