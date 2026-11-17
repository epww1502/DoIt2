import { sharedParams, sharedPrefill } from '@/lib/shareIn';

describe('공유로 담기', () => {
  it('링크와 페이지 제목이 오면 이름과 링크를 채운다', () => {
    expect(
      sharedPrefill({
        text: 'https://www.instagram.com/p/abc/',
        webUrl: 'https://www.instagram.com/p/abc/',
        meta: { title: '성수동 파스타 맛집' },
      })
    ).toEqual({
      mapText: null,
      title: '성수동 파스타 맛집',
      url: 'https://www.instagram.com/p/abc/',
      linkTitle: '성수동 파스타 맛집',
    });
  });

  it('글과 링크가 같이 오면 글의 첫 줄을 이름으로 쓴다', () => {
    const prefill = sharedPrefill({
      text: '여기 꼭 가보자\nhttps://youtu.be/xyz 진짜 예쁨',
    });
    expect(prefill?.title).toBe('여기 꼭 가보자');
    expect(prefill?.url).toBe('https://youtu.be/xyz');
  });

  it('글만 오면 이름만 채운다 (40자까지)', () => {
    const prefill = sharedPrefill({ text: '가'.repeat(60) });
    expect(prefill?.title).toHaveLength(40);
    expect(prefill?.url).toBeNull();
  });

  it('지도 앱 공유 글은 통째로 넘겨서 담기 화면이 장소를 찾게 한다', () => {
    const text =
      '[네이버 지도]\n성수동 파스타집\n서울 성동구 성수이로 1\nhttps://naver.me/abcd1234';
    const prefill = sharedPrefill({ text });
    expect(prefill?.mapText).toBe(text);
    expect(sharedParams(prefill!)).toEqual({ sharedMap: text });
  });

  it('쓸 게 없으면 아무것도 하지 않는다', () => {
    expect(sharedPrefill({})).toBeNull();
    expect(sharedPrefill({ text: '   ', webUrl: null })).toBeNull();
  });
});
