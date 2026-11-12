import { daysBetween } from '@/lib/bucket/dateVotes';

describe('daysBetween (되는 날 끌어서 고르기)', () => {
  it('앞에서 뒤로 끌어도, 뒤에서 앞으로 끌어도 같은 기간', () => {
    const forward = daysBetween('2026-11-20', '2026-11-23', '2026-11-01');
    expect(forward).toEqual([
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
      '2026-11-23',
    ]);
    expect(daysBetween('2026-11-23', '2026-11-20', '2026-11-01')).toEqual(
      forward
    );
  });

  it('지난 날은 빼고 오늘부터만', () => {
    expect(daysBetween('2026-11-10', '2026-11-13', '2026-11-12')).toEqual([
      '2026-11-12',
      '2026-11-13',
    ]);
  });

  it('한 날만 누르고 떼면 그 하루', () => {
    expect(daysBetween('2026-11-20', '2026-11-20', '2026-11-01')).toEqual([
      '2026-11-20',
    ]);
  });
});
