import {
  mapAppOf,
  nameFromPage,
  parseMapShare,
  pickSharedPlace,
} from '@/lib/bucket/mapShare';
import type { PlaceInfo } from '@/lib/bucket/types';

const place = (name: string, address: string): PlaceInfo => ({
  kakaoId: name,
  name,
  category: '',
  address,
  latitude: 0,
  longitude: 0,
});

describe('지도 공유 글 읽기', () => {
  it('네이버지도 공유 글에서 이름·주소·링크', () => {
    expect(
      parseMapShare(
        '[네이버지도]\n이케아 광명점\n경기 광명시 일직로 17\nhttps://naver.me/FRuq1234'
      )
    ).toEqual({
      url: 'https://naver.me/FRuq1234',
      app: 'naver',
      name: '이케아 광명점',
      address: '경기 광명시 일직로 17',
    });
  });

  it('카카오맵 공유 글 (꼬리표와 이름이 한 줄)', () => {
    expect(
      parseMapShare(
        '[카카오맵] 런던베이글뮤지엄 안국점\n서울 종로구 북촌로4길 20 https://kko.to/abcDEF'
      )
    ).toMatchObject({
      app: 'kakao',
      name: '런던베이글뮤지엄 안국점',
      address: '서울 종로구 북촌로4길 20',
    });
  });

  it('줄바꿈이 사라져 한 줄로 붙어도 이름과 주소를 나눈다', () => {
    expect(
      parseMapShare(
        '[네이버지도] 이케아 광명점 경기 광명시 일직로 17 https://naver.me/x1'
      )
    ).toMatchObject({
      name: '이케아 광명점',
      address: '경기 광명시 일직로 17',
    });
  });

  it('링크만 있으면 이름·주소 없이', () => {
    expect(parseMapShare('https://kko.to/abc')).toEqual({
      url: 'https://kko.to/abc',
      app: 'kakao',
      name: null,
      address: null,
    });
  });

  it('지도 링크가 아니면 null', () => {
    expect(parseMapShare('이케아 가기')).toBeNull();
    expect(parseMapShare('https://blog.naver.com/abc/123')).toBeNull();
    expect(mapAppOf('https://map.naver.com/p/entry/place/1')).toBe('naver');
  });
});

describe('링크만 붙였을 때 이름 찾기', () => {
  it('최종 주소의 검색어', () => {
    expect(
      nameFromPage(
        'https://map.naver.com/p/search/%EC%9D%B4%EC%BC%80%EC%95%84/place/123',
        '네이버 지도'
      )
    ).toBe('이케아');
  });

  it('페이지 제목 (지도 앱 이름은 떼고, 이름뿐이면 null)', () => {
    expect(nameFromPage(null, '이케아 광명점 : 네이버')).toBe('이케아 광명점');
    expect(nameFromPage(null, '카카오맵')).toBeNull();
    expect(nameFromPage(null, null)).toBeNull();
  });
});

describe('검색 결과에서 고르기', () => {
  const places = [
    place('이케아 고양점', '경기 고양시 덕양구 권율대로 420'),
    place('이케아 광명점', '경기 광명시 일직로 17'),
  ];

  it('주소가 맞는 곳', () => {
    expect(
      pickSharedPlace(places, '이케아', '경기도 광명시 일직로 17')?.name
    ).toBe('이케아 광명점');
  });

  it('주소가 없으면 이름이 같은 곳, 없으면 첫 번째', () => {
    expect(pickSharedPlace(places, '이케아 광명점', null)?.name).toBe(
      '이케아 광명점'
    );
    expect(pickSharedPlace(places, '이케아', null)?.name).toBe('이케아 고양점');
    expect(pickSharedPlace([], '이케아', null)).toBeNull();
  });
});
