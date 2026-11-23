import {
  errorReportText,
  pinFailureMessage,
  stepLabel,
  whoLabel,
} from '@/lib/admin';

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

describe('로그 화면', () => {
  it('기능 이름은 한국어로, 모르는 이름은 그대로 보여준다', () => {
    expect(stepLabel('invite_sent')).toBe('초대 보냄');
    expect(stepLabel('brand_new_step')).toBe('brand_new_step');
  });

  it('닉네임이 없으면 계정 id 앞 네 자리로 누군지 구분한다', () => {
    expect(whoLabel('abcd1234-ffff', null)).toBe('이름 없음 · abcd');
    expect(whoLabel('abcd1234-ffff', '  민지 ')).toBe('민지');
    expect(whoLabel(null, null)).toBe('알 수 없음');
  });

  it('오류를 복사하면 원인을 찾는 데 필요한 것이 다 들어 있다', () => {
    const text = errorReportText({
      id: 1,
      occurred_at: '2026-11-23T01:02:03Z',
      kind: 'crash',
      platform: 'android',
      app_version: '0.3.0',
      update_id: 'u-1',
      title: '항목 화면',
      message: 'TypeError: x is undefined',
      stack: 'at Item (item.tsx:10)',
      user_id: 'user-1',
      nickname: null,
    });
    expect(text).toContain('[앱 꺼짐] 항목 화면');
    expect(text).toContain('android 0.3.0');
    expect(text).toContain('update u-1');
    expect(text).toContain('user user-1');
    expect(text).toContain('TypeError: x is undefined');
    expect(text).toContain('at Item (item.tsx:10)');
  });
});
