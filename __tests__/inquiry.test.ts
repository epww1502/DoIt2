import { inquiryErrorMessage } from '@/lib/inquiry';

jest.mock('@/lib/supabase/client', () => ({ supabase: {} }));
jest.mock('@/lib/appVersion', () => ({ installedVersion: () => '0.3.0' }));

describe('inquiryErrorMessage', () => {
  it('tells the sender to come back tomorrow when the daily limit is hit', () => {
    expect(inquiryErrorMessage('too_many')).toContain('내일');
  });

  it('explains empty and too-long messages', () => {
    expect(inquiryErrorMessage('empty')).toContain('적어주세요');
    expect(inquiryErrorMessage('too_long')).toContain('줄여');
  });

  it('falls back to a retry message for anything else', () => {
    expect(inquiryErrorMessage('server')).toContain('다시 시도');
    expect(inquiryErrorMessage(undefined)).toContain('다시 시도');
  });
});
