import {
  addDays,
  goitShareUrl,
  parseGoitId,
  planUrl,
  stopCategory,
  stopKey,
  toTrip,
  tripDates,
  tripToItems,
  type GoitTrip,
} from '@/lib/goit';

const ID = 'aB3_dE-fGhIjKlMn0p';

const place = (name: string, extra: Record<string, unknown> = {}) => ({
  kakaoId: '12345',
  name,
  category: '관광명소',
  address: '부산 기장군 기장읍 용궁길 86',
  latitude: 35.188,
  longitude: 129.223,
  ...extra,
});

const raw = {
  title: '부산 바다 여행',
  conditions: {
    region: '부산',
    style: 'relaxed',
    mode: 'car',
    notes: ['바다 보면서 쉬기'],
    people: 2,
    startDate: '2026-11-30',
  },
  days: [
    {
      stops: [
        {
          id: 's1',
          place: place('해동용궁사'),
          kind: 'sight',
          stayMin: 60,
          why: '바다 위 절이에요',
          pinned: true,
        },
        {
          id: 's2',
          place: place('원조할매국밥', { kakaoId: '999', category: '국밥' }),
          kind: 'food',
          stayMin: 50,
          why: '',
          pinned: false,
        },
      ],
    },
    {
      stops: [
        {
          id: 's3',
          place: place('부산시립미술관', { category: '미술관' }),
          kind: 'sight',
          stayMin: 90,
          why: '비 오면 여기',
          pinned: false,
        },
      ],
    },
  ],
};

const trip = toTrip(raw) as GoitTrip;

describe('parseGoitId', () => {
  it('id만 넣어도 된다', () => {
    expect(parseGoitId(`  ${ID} `)).toBe(ID);
  });

  it('고잇투 공유 링크', () => {
    expect(parseGoitId(`https://go-it-2.vercel.app/trip/shared?id=${ID}`)).toBe(
      ID
    );
  });

  it('두잇투 가져오기 페이지와 앱 링크', () => {
    expect(parseGoitId(`https://doit2app.github.io/goit.html?t=${ID}`)).toBe(
      ID
    );
    expect(parseGoitId(`doit2://import/goit?t=${ID}`)).toBe(ID);
  });

  it('메시지 안에 섞인 링크도 찾는다', () => {
    expect(
      parseGoitId(
        `부산 일정 짰어!\nhttps://go-it-2.vercel.app/trip/shared?id=${ID}&x=1 봐봐`
      )
    ).toBe(ID);
  });

  it('맞지 않는 글은 null', () => {
    expect(parseGoitId('')).toBeNull();
    expect(parseGoitId(null)).toBeNull();
    expect(parseGoitId('short')).toBeNull();
    expect(parseGoitId('공유 코드: K7QM3X')).toBeNull();
    expect(parseGoitId(`https://evil.example.com/?id=${ID}`)).toBeNull();
    expect(
      parseGoitId(`https://go-it-2.vercel.app/trip/shared?id=${'a'.repeat(45)}`)
    ).toBeNull();
    expect(parseGoitId('a'.repeat(41))).toBeNull();
    expect(parseGoitId('abc def ghi jkl mno pqr')).toBeNull();
  });
});

describe('toTrip', () => {
  it('맞는 모양이면 그대로 읽는다', () => {
    expect(trip.title).toBe('부산 바다 여행');
    expect(trip.conditions.startDate).toBe('2026-11-30');
    expect(trip.days).toHaveLength(2);
    expect(trip.days[0].stops[0].place.name).toBe('해동용궁사');
  });

  it('이상한 값은 null', () => {
    expect(toTrip(null)).toBeNull();
    expect(toTrip('trip')).toBeNull();
    expect(toTrip({ title: 'x' })).toBeNull();
    expect(toTrip({ title: 'x', days: [] })).toBeNull();
    expect(
      toTrip({ days: [{ stops: [{ place: { name: 'x' } }] }] })
    ).toBeNull();
  });

  it('장소가 망가진 것만 빼고, 날짜가 틀리면 버린다', () => {
    const t = toTrip({
      ...raw,
      conditions: { ...raw.conditions, startDate: '2026-02-30' },
      days: [
        {
          stops: [
            ...raw.days[0].stops,
            { place: { name: '좌표 없음' } },
            'junk',
            {
              place: place('이상한 종류', { kakaoId: 42 }),
              kind: 'party',
            },
          ],
        },
      ],
    });
    expect(t?.days[0].stops.map((s) => s.place.name)).toEqual([
      '해동용궁사',
      '원조할매국밥',
      '이상한 종류',
    ]);
    expect(t?.days[0].stops[2].kind).toBe('sight');
    expect(t?.days[0].stops[2].place.kakaoId).toBeNull();
    expect(t?.conditions.startDate).toBeUndefined();
  });

  it('제목이 없으면 지역으로', () => {
    expect(toTrip({ ...raw, title: '' })?.title).toBe('부산 여행');
  });
});

describe('날짜', () => {
  it('달과 해가 넘어가도 맞다', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-01-31', 0)).toBe('2026-01-31');
  });

  it('여행 첫날과 마지막 날', () => {
    expect(tripDates(trip)).toEqual({ from: '2026-11-30', to: '2026-12-01' });
    expect(
      tripDates({
        ...trip,
        conditions: { ...trip.conditions, startDate: undefined },
      })
    ).toBeNull();
  });
});

describe('stopCategory', () => {
  it('종류와 장소 카테고리로 고른다', () => {
    expect(stopCategory(trip.days[0].stops[0])).toBe('trip');
    expect(stopCategory(trip.days[0].stops[1])).toBe('food');
    expect(stopCategory(trip.days[1].stops[0])).toBe('culture');
    expect(
      stopCategory({ kind: 'cafe', place: trip.days[0].stops[0].place })
    ).toBe('cafe');
    expect(
      stopCategory({ kind: 'activity', place: trip.days[0].stops[0].place })
    ).toBe('activity');
  });
});

describe('tripToItems: 장소마다', () => {
  const items = tripToItems(trip, 'each', { id: ID });

  it('장소마다 하나씩, 일차의 날을 목표 날짜로', () => {
    expect(items.map((i) => i.title)).toEqual([
      '해동용궁사',
      '원조할매국밥',
      '부산시립미술관',
    ]);
    expect(items.map((i) => i.goal?.date)).toEqual([
      '2026-11-30',
      '2026-11-30',
      '2026-12-01',
    ]);
    expect(items[0].goal?.remind).toEqual(['day', 'morning']);
  });

  it('카테고리, 실내외, 장소, 메모, 링크', () => {
    expect(items[0]).toMatchObject({
      kind: 'place',
      category: 'trip',
      setting: 'outdoor',
      place: { kakaoId: '12345', name: '해동용궁사' },
      memo: '바다 위 절이에요\n고잇투 · 부산 바다 여행 1일차',
      links: [
        { url: goitShareUrl(ID), title: '부산 바다 여행', site: '고잇투' },
      ],
    });
    expect(items[1]).toMatchObject({ category: 'food', setting: 'indoor' });
    expect(items[1].memo).toBe('고잇투 · 부산 바다 여행 1일차');
    expect(items[2]).toMatchObject({ category: 'culture', setting: 'indoor' });
    expect(items[2].memo).toContain('2일차');
  });

  it('고른 것만 담는다', () => {
    const picked = tripToItems(trip, 'each', {
      id: ID,
      selected: new Set([stopKey(1, 0)]),
    });
    expect(picked.map((i) => i.title)).toEqual(['부산시립미술관']);
    expect(tripToItems(trip, 'each', { id: ID, selected: new Set() })).toEqual(
      []
    );
  });

  it('제목은 40자까지, 시작일이 없으면 목표 날짜 없음', () => {
    const long = toTrip({
      ...raw,
      conditions: { ...raw.conditions, startDate: undefined },
      days: [
        {
          stops: [{ ...raw.days[0].stops[0], place: place('가'.repeat(55)) }],
        },
      ],
    }) as GoitTrip;
    const [item] = tripToItems(long, 'each', { id: ID });
    expect(item.title).toBe('가'.repeat(40));
    expect(item.goal).toBeNull();
  });
});

describe('tripToItems: 여행 하나로', () => {
  it('하나로 담고 장소는 할 것으로', () => {
    const [item] = tripToItems(trip, 'trip', { id: ID });
    expect(item).toMatchObject({
      kind: 'place',
      title: '부산 바다 여행',
      category: 'trip',
      setting: 'outdoor',
      place: { name: '해동용궁사' },
      goal: { date: '2026-11-30', until: '2026-12-01' },
      links: [{ url: goitShareUrl(ID), site: '고잇투' }],
    });
    expect(item.todos?.map((t) => t.text)).toEqual([
      '1일차 · 해동용궁사',
      '1일차 · 원조할매국밥',
      '2일차 · 부산시립미술관',
    ]);
    expect(item.todos?.every((t) => !t.done && t.place && t.id)).toBe(true);
    expect(new Set(item.todos?.map((t) => t.id)).size).toBe(3);
  });

  it('고른 것만, 첫 장소는 고른 것 중 첫 번째', () => {
    const [item] = tripToItems(trip, 'trip', {
      id: ID,
      selected: new Set([stopKey(0, 1), stopKey(1, 0)]),
    });
    expect(item.place?.name).toBe('원조할매국밥');
    expect(item.todos).toHaveLength(2);
  });

  it('하루짜리면 기간 없이, 날짜가 없으면 목표 없음', () => {
    const oneDay = { ...trip, days: [trip.days[0]] };
    expect(tripToItems(oneDay, 'trip', { id: ID })[0].goal).toMatchObject({
      date: '2026-11-30',
      until: null,
    });
    const noDate = {
      ...trip,
      conditions: { ...trip.conditions, startDate: undefined },
    };
    expect(tripToItems(noDate, 'trip', { id: ID })[0].goal).toBeNull();
  });
});

describe('planUrl', () => {
  it('지역·장소·날짜를 싣는다', () => {
    const url = new URL(
      planUrl({
        places: [
          {
            name: '해운대 블루라인파크',
            address: '부산 해운대구 청사포로 116',
          },
        ],
        date: '2026-12-05',
      })
    );
    expect(url.origin).toBe('https://go-it-2.vercel.app');
    expect(url.searchParams.get('q')).toBe('부산 여행');
    expect(url.searchParams.getAll('must')).toEqual(['해운대 블루라인파크']);
    expect(url.searchParams.get('date')).toBe('2026-12-05');
    expect(url.searchParams.get('from')).toBe('doit2');
  });

  it('주소를 모르면 국내 여행, 시·도 이름은 줄인다', () => {
    const q = (address: string) =>
      new URL(planUrl({ places: [{ name: 'x', address }] })).searchParams.get(
        'q'
      );
    expect(q('')).toBe('국내 여행');
    expect(q('서울특별시 종로구')).toBe('서울 여행');
    expect(q('제주특별자치도 제주시')).toBe('제주 여행');
    expect(q('강원도 강릉시')).toBe('강원 여행');
    expect(new URL(planUrl({ places: [] })).searchParams.get('q')).toBe(
      '국내 여행'
    );
  });

  it('특수 글자는 인코딩하고, 이름은 8곳·40자까지, 날짜가 틀리면 뺀다', () => {
    const places = Array.from({ length: 10 }, (_, i) => ({
      name: `A&B=${i} #카페`,
      address: '부산 중구',
    }));
    places.push({ name: '가'.repeat(50), address: '' });
    const str = planUrl({ places, date: 'tomorrow' });
    expect(str).not.toContain('&B=');
    expect(str).not.toContain('#');
    const url = new URL(str);
    expect(url.searchParams.getAll('must')).toHaveLength(8);
    expect(url.searchParams.getAll('must')[0]).toBe('A&B=0 #카페');
    expect(url.searchParams.has('date')).toBe(false);

    const longName = new URL(
      planUrl({ places: [{ name: '가'.repeat(50), address: '' }] })
    ).searchParams.get('must');
    expect(longName).toBe('가'.repeat(40));
  });

  it('같은 이름은 한 번만', () => {
    const url = new URL(
      planUrl({
        places: [
          { name: '광안리', address: '부산 수영구' },
          { name: '광안리', address: '부산 수영구' },
        ],
      })
    );
    expect(url.searchParams.getAll('must')).toEqual(['광안리']);
  });
});
