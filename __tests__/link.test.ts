import { linkHost, linkLabel, normalizeUrl } from '@/lib/bucket/link';

describe('링크', () => {
  it('앞을 빼고 붙인 주소에 https://를 붙인다', () => {
    expect(normalizeUrl('naver.me/xAbc')).toBe('https://naver.me/xAbc');
    expect(normalizeUrl(' https://youtu.be/abc ')).toBe('https://youtu.be/abc');
  });

  it('공유하기로 복사한 글에서 주소만 고른다', () => {
    expect(
      normalizeUrl('[네이버 지도] 이케아 광명점 https://naver.me/5abc')
    ).toBe('https://naver.me/5abc');
  });

  it('주소가 아니면 null', () => {
    expect(normalizeUrl('')).toBeNull();
    expect(normalizeUrl('hello')).toBeNull();
    expect(normalizeUrl('그냥 메모')).toBeNull();
    expect(normalizeUrl('ftp://a.com')).toBeNull();
  });

  it('제목이 없으면 사이트 주소', () => {
    expect(linkHost('https://www.instagram.com/p/xx')).toBe('instagram.com');
    expect(linkLabel({ url: 'https://www.instagram.com/p/xx' })).toBe(
      'instagram.com'
    );
    expect(linkLabel({ url: 'https://a.com', title: ' 맛집 ' })).toBe('맛집');
  });
});
