import { cleanInviteCode, inviteLink, inviteMessage } from '@/lib/inviteLink';

const space = {
  name: '우리의 버킷 & 리스트',
  emoji: '✨',
  invite_code: 'K7M2QX',
};

describe('inviteLink', () => {
  it('코드·이름·이모지를 주소에 싣는다', () => {
    const url = new URL(inviteLink(space));
    expect(url.origin + url.pathname).toBe(
      'https://doit2app.github.io/join.html'
    );
    expect(url.searchParams.get('c')).toBe('K7M2QX');
    expect(url.searchParams.get('s')).toBe('우리의 버킷 & 리스트');
    expect(url.searchParams.get('e')).toBe('✨');
  });

  it('이모지가 없으면 그 칸은 뺀다', () => {
    expect(inviteLink({ ...space, emoji: '' })).not.toContain('e=');
  });

  it('초대 글에는 링크와 코드가 둘 다 있다', () => {
    const message = inviteMessage(space);
    expect(message).toContain(inviteLink(space));
    expect(message).toContain('초대 코드: K7M2QX');
  });
});

describe('cleanInviteCode', () => {
  it('대문자로 바꾸고 다른 글자는 뺀다', () => {
    expect(cleanInviteCode('k7m-2qx')).toBe('K7M2QX');
  });

  it('6자리까지만 받는다', () => {
    expect(cleanInviteCode('ABCDEFGH')).toBe('ABCDEF');
  });

  it('없으면 빈 글자', () => {
    expect(cleanInviteCode(undefined)).toBe('');
    expect(cleanInviteCode(['abc234', 'zzz'])).toBe('ABC234');
  });
});
