import { quickActionHref, quickActionItems } from '@/lib/quickActions';

describe('앱 아이콘 꾹 누르기 바로가기', () => {
  it('세 가지가 있고, 폰 종류에 따라 아이콘 이름이 다르다', () => {
    const ios = quickActionItems('ios');
    const android = quickActionItems('android');
    expect(ios.map((a) => a.title)).toEqual([
      '새로 담기',
      '오늘 뭐 하지',
      '일지 보기',
    ]);
    expect(ios.map((a) => a.params.href)).toEqual(
      android.map((a) => a.params.href)
    );
    expect(android.every((a) => a.icon.startsWith('shortcut_'))).toBe(true);
    expect(ios.some((a) => a.icon.startsWith('shortcut_'))).toBe(false);
  });

  it('눌린 바로가기에서 갈 화면을 꺼낸다', () => {
    expect(quickActionHref({ id: 'pick', params: { href: '/pick' } })).toBe(
      '/pick'
    );
  });

  it('우리가 만든 바로가기가 아니면 어디로도 보내지 않는다', () => {
    expect(quickActionHref(null)).toBeNull();
    expect(quickActionHref({ id: 'x' })).toBeNull();
    expect(quickActionHref({ params: { href: '/account/delete' } })).toBeNull();
    expect(quickActionHref({ params: { href: 42 } })).toBeNull();
  });
});
