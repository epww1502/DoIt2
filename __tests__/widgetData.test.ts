import type { BucketItem } from '@/lib/bucket/types';
import {
  ddayProps,
  memoryProps,
  nextProps,
  pickProps,
  widgetDays,
} from '@/lib/widgets/data';

const item = (id: string, extra: Partial<BucketItem> = {}): BucketItem =>
  ({
    id,
    title: `항목 ${id}`,
    kind: 'place',
    category: 'trip',
    setting: 'outdoor',
    location: '',
    place: null,
    memo: '',
    createdAt: `2026-11-0${id.length}T00:00:00.000Z`,
    done: null,
    ...extra,
  }) as BucketItem;

const TODAY = '2026-11-17';

describe('위젯에 넘길 값', () => {
  it('1년 전 오늘 기록이 있으면 추억으로 보여준다', () => {
    const items = [
      item('a', {
        title: '제주 협재 해변',
        done: { date: '2025-11-17', rating: 4, review: '노을이 예뻤다' },
      } as Partial<BucketItem>),
    ];
    expect(memoryProps(items, TODAY)).toEqual({
      label: '1년 전 오늘',
      title: '제주 협재 해변',
      stars: '★★★★☆',
      review: '노을이 예뻤다',
      url: 'doit2://item/a?from=widget',
    });
  });

  it('추억이 없으면 빈 값이고 누르면 앱 첫 화면으로 간다', () => {
    expect(memoryProps([item('a')], TODAY)).toMatchObject({
      label: '',
      url: 'doit2://?from=widget',
    });
  });

  it('가장 가까운 일정의 D-day를 그날 기준으로 센다', () => {
    const items = [
      item('a', {
        title: '가평 글램핑',
        goal: { date: '2026-11-29' },
      } as Partial<BucketItem>),
      item('bb', { goal: { date: '2026-12-25' } } as Partial<BucketItem>),
    ];
    expect(ddayProps(items, TODAY)).toMatchObject({
      dday: 'D-12',
      title: '가평 글램핑',
      date: '11월 29일',
      url: 'doit2://item/a?from=widget',
    });
    // 미리 만들어 두는 다음 날 치는 하루 줄어 있다
    expect(ddayProps(items, '2026-11-18').dday).toBe('D-11');
    expect(ddayProps(items, '2026-11-29').dday).toBe('D-DAY');
    // 그날이 지나면 다음 일정으로 넘어간다
    expect(ddayProps(items, '2026-11-30').dday).toBe('D-25');
  });

  it('일정이 없으면 빈 값', () => {
    expect(ddayProps([item('a')], TODAY).dday).toBe('');
  });

  it('다음에 할 것은 안 한 것만, 최근에 담은 것부터 4개와 남은 수', () => {
    const items = [
      item('a'),
      item('bb'),
      item('ccc'),
      item('dddd'),
      item('eeeee'),
      item('ffffff', {
        done: { date: '2026-11-01', rating: 5, review: '' },
      } as Partial<BucketItem>),
    ];
    const next = nextProps(items, TODAY);
    expect(next.items.map((i) => i.url)).toEqual([
      'doit2://item/eeeee?from=widget',
      'doit2://item/dddd?from=widget',
      'doit2://item/ccc?from=widget',
      'doit2://item/bb?from=widget',
    ]);
    expect(next.more).toBe(1);
  });

  it('긴 이름은 줄인다', () => {
    const next = nextProps([item('a', { title: '가'.repeat(40) })], TODAY);
    expect(next.items[0].title).toHaveLength(24);
    expect(next.items[0].title.endsWith('…')).toBe(true);
  });

  it('뽑기 후보는 안 한 것을 섞어서 넘긴다 (같은 것이 두 번 나오지 않는다)', () => {
    const items = Array.from({ length: 20 }, (_, i) => item(`i${i}`));
    let seed = 0;
    const picks = pickProps(items, TODAY, () => (seed = (seed + 0.37) % 1));
    expect(picks.picks).toHaveLength(12);
    expect(new Set(picks.picks.map((p) => p.url)).size).toBe(12);
    expect(picks.index).toBe(0);
    expect(pickProps([], TODAY).picks).toEqual([]);
  });

  it('며칠 치 날짜를 오늘부터 만든다', () => {
    expect(widgetDays('2026-12-30', 4)).toEqual([
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
    ]);
  });
});
