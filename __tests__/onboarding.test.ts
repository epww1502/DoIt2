import {
  inviteCodeFromText,
  needsWelcome,
  STARTERS,
  WHO_OPTIONS,
} from '@/lib/onboarding';

describe('inviteCodeFromText', () => {
  it('초대 글에서 코드를 찾는다', () => {
    expect(
      inviteCodeFromText(
        "DoIt2에서 '우리 둘' 버킷리스트 같이 쓰자 ✨\nhttps://doit2app.github.io/join.html?c=AB12CD&s=x\n초대 코드: AB12CD"
      )
    ).toBe('AB12CD');
  });

  it('초대 페이지가 복사해 주는 글에서 찾는다', () => {
    expect(inviteCodeFromText('DoIt2 초대 코드: ab12cd')).toBe('AB12CD');
  });

  it('초대 링크만 있어도 찾는다', () => {
    expect(
      inviteCodeFromText('https://doit2app.github.io/join.html?s=a&c=ZZ99ZZ')
    ).toBe('ZZ99ZZ');
  });

  it('코드만 복사했으면 그대로 쓴다', () => {
    expect(inviteCodeFromText(' ab12cd \n')).toBe('AB12CD');
  });

  it('상관없는 글에서는 뽑지 않는다', () => {
    expect(inviteCodeFromText('오늘 저녁 뭐 먹지 123456 원')).toBe('');
    expect(inviteCodeFromText('초대 코드: ABC1234')).toBe('');
    expect(inviteCodeFromText('')).toBe('');
    expect(inviteCodeFromText(null)).toBe('');
  });
});

describe('needsWelcome', () => {
  const fresh = { welcomed: false, settled: true, spaceCount: 0, itemCount: 0 };

  it('처음 켠 사람에게만 보여준다', () => {
    expect(needsWelcome(fresh)).toBe(true);
  });

  it('이미 봤으면 다시 보여주지 않는다', () => {
    expect(needsWelcome({ ...fresh, welcomed: true })).toBe(false);
  });

  it('쓰던 사람(공간이나 담은 것이 있음)에게는 보여주지 않는다', () => {
    expect(needsWelcome({ ...fresh, spaceCount: 1 })).toBe(false);
    expect(needsWelcome({ ...fresh, itemCount: 3 })).toBe(false);
  });

  it('공간 확인이 끝나기 전에는 판단하지 않는다', () => {
    expect(needsWelcome({ ...fresh, settled: false })).toBe(false);
  });
});

describe('처음에 보여주는 예시', () => {
  it('고를 수 있는 사람마다 예시가 있고, 종류가 카테고리와 맞는다', () => {
    const placeCategories = ['food', 'cafe', 'trip', 'activity', 'culture'];
    for (const who of WHO_OPTIONS) {
      const starters = STARTERS[who.key];
      expect(starters.length).toBeGreaterThanOrEqual(6);
      expect(new Set(starters.map((s) => s.title)).size).toBe(starters.length);
      for (const s of starters) {
        expect(s.kind).toBe(
          placeCategories.includes(s.category) ? 'place' : 'activity'
        );
      }
    }
  });

  it('함께 쓰는 선택지에는 만들어 줄 공간 이름이 있다', () => {
    for (const who of WHO_OPTIONS) {
      expect(Boolean(who.spaceName)).toBe(who.key !== 'solo');
    }
  });
});
