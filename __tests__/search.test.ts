import { matchesQuery, sortItems } from '@/lib/bucket/search';
import type { BucketItem } from '@/lib/bucket/types';

function item(id: string, overrides: Partial<BucketItem> = {}): BucketItem {
  return {
    id,
    kind: 'place',
    title: id,
    category: 'food',
    setting: 'indoor',
    location: '',
    place: null,
    memo: '',
    createdAt: '2026-10-01T00:00:00Z',
    done: null,
    ...overrides,
  };
}

describe('검색', () => {
  it('띄어쓰기·대소문자 상관없이 제목·메모·장소에서 찾는다', () => {
    const pasta = item('성수동 생면 파스타 집', {
      memo: 'Cream 파스타 유명',
      place: {
        kakaoId: null,
        name: '성수 파스타',
        category: '이탈리안',
        address: '서울 성동구 성수이로 88',
        latitude: 0,
        longitude: 0,
      },
    });
    expect(matchesQuery(pasta, '생면파스타')).toBe(true);
    expect(matchesQuery(pasta, 'cream')).toBe(true);
    expect(matchesQuery(pasta, '성동구')).toBe(true);
    expect(matchesQuery(pasta, '제주')).toBe(false);
    expect(matchesQuery(pasta, '  ')).toBe(true);
  });
});

describe('정렬', () => {
  const a = item('가', { createdAt: '2026-10-03T00:00:00Z' });
  const b = item('다', {
    createdAt: '2026-10-01T00:00:00Z',
    goal: { date: '2026-12-01', remind: [] },
  });
  const c = item('나', {
    createdAt: '2026-10-02T00:00:00Z',
    goal: { date: '2026-11-01', remind: [] },
  });

  it('최근 순 / 오래된 순', () => {
    expect(sortItems([a, b, c], 'recent').map((i) => i.id)).toEqual([
      '가',
      '나',
      '다',
    ]);
    expect(sortItems([a, b, c], 'oldest').map((i) => i.id)).toEqual([
      '다',
      '나',
      '가',
    ]);
  });

  it('이름 순 (가나다)', () => {
    expect(sortItems([b, a, c], 'name').map((i) => i.id)).toEqual([
      '가',
      '나',
      '다',
    ]);
  });

  it('목표 날짜 가까운 순, 날짜 없는 건 뒤에', () => {
    expect(sortItems([a, b, c], 'goal').map((i) => i.id)).toEqual([
      '나',
      '다',
      '가',
    ]);
  });
});
