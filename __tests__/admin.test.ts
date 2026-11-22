import { pinFailureMessage } from '@/lib/admin';

jest.mock('@/lib/supabase/client', () => ({ supabase: {} }));

describe('pinFailureMessage', () => {
  it('says how many tries are left before the lock', () => {
    const message = pinFailureMessage({ ok: false, reason: 'wrong', left: 2 });
    expect(message).toContain('2번 더');
    expect(message).toContain('1시간');
  });

  it('says when it opens again once locked', () => {
    const until = new Date(2026, 10, 22, 15, 5).toISOString();
    expect(
      pinFailureMessage({ ok: false, reason: 'locked', locked_until: until })
    ).toContain('오후 3:05');
  });

  it('asks for six digits when the new pin is malformed', () => {
    expect(pinFailureMessage({ ok: false, reason: 'bad_pin' })).toContain(
      '숫자 6자리'
    );
  });

  it('never claims success for unknown results', () => {
    expect(pinFailureMessage({ ok: false })).toContain('다시');
  });
});
