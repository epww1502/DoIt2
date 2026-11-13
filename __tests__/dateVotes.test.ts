import {
  tallyDays,
  voteDayLabel,
  voterCount,
  runAround,
} from '@/lib/bucket/dateVotes';

const votes = [
  { day: '2026-11-10', user_id: 'a' },
  { day: '2026-11-21', user_id: 'a' },
  { day: '2026-11-22', user_id: 'a' },
  { day: '2026-11-22', user_id: 'b' },
  { day: '2026-11-15', user_id: 'b' },
  { day: '2026-11-22', user_id: 'b' },
];

describe('같이 갈 날 표', () => {
  it('지난 날은 빼고 날짜 순으로 모은다', () => {
    const tally = tallyDays(votes, '2026-11-11');
    expect(tally.map((t) => t.day)).toEqual([
      '2026-11-15',
      '2026-11-21',
      '2026-11-22',
    ]);
    expect(tally[2].users).toEqual(['a', 'b']);
  });

  it('고른 사람 수는 지난 날만 고른 사람을 빼고 센다', () => {
    expect(voterCount(votes, '2026-11-11')).toBe(2);
    expect(
      voterCount([{ day: '2026-11-01', user_id: 'c' }], '2026-11-11')
    ).toBe(0);
  });

  it('날짜 글자', () => {
    expect(voteDayLabel('2026-11-21')).toBe('11월 21일 (토)');
  });
});

describe('이어진 기간 찾기', () => {
  const picked = [
    '2026-11-20',
    '2026-11-21',
    '2026-11-22',
    '2026-11-25',
    '2026-11-30',
    '2026-12-01',
  ];

  it('누른 날과 붙은 날을 앞뒤로 모두 찾는다', () => {
    expect(runAround(picked, '2026-11-21')).toEqual([
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
    ]);
  });

  it('하루만 고른 날은 그 날만', () => {
    expect(runAround(picked, '2026-11-25')).toEqual(['2026-11-25']);
  });

  it('달이 바뀌어도 이어진다', () => {
    expect(runAround(picked, '2026-12-01')).toEqual([
      '2026-11-30',
      '2026-12-01',
    ]);
  });

  it('안 고른 날이면 빈 목록', () => {
    expect(runAround(picked, '2026-11-23')).toEqual([]);
  });
});
