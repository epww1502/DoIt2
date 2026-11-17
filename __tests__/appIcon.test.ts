import appJson from '../app.json';

import {
  allIconNames,
  canPickTextColor,
  choiceFromIconName,
  DEFAULT_ICON,
  iconName,
} from '@/lib/appIcon';

describe('앱 아이콘 고르기', () => {
  it('기본 아이콘(글자·하늘 바탕)은 이름이 없다', () => {
    expect(iconName(DEFAULT_ICON)).toBeNull();
  });

  it('조합마다 아이콘 이름이 정해진다', () => {
    expect(
      iconName({ style: 'text', background: 'pink', textColor: 'sky' })
    ).toBe('text_light_pink');
    expect(
      iconName({ style: 'text', background: 'night', textColor: 'mint' })
    ).toBe('text_dark_mint');
    expect(
      iconName({ style: 'char', background: 'night', textColor: 'mint' })
    ).toBe('char_night');
    expect(
      iconName({ style: 'char', background: 'orange', textColor: 'mint' })
    ).toBe('char_orange');
  });

  it('글자색은 글자 모양에 밤색 바탕일 때만 고른다', () => {
    expect(
      canPickTextColor({ style: 'text', background: 'night', textColor: 'sky' })
    ).toBe(true);
    expect(
      canPickTextColor({ style: 'text', background: 'pink', textColor: 'sky' })
    ).toBe(false);
    expect(
      canPickTextColor({ style: 'char', background: 'night', textColor: 'sky' })
    ).toBe(false);
  });

  it('이름에서 조합으로 되돌릴 수 있다', () => {
    for (const name of allIconNames()) {
      expect(iconName(choiceFromIconName(name))).toBe(name);
    }
    expect(choiceFromIconName(null)).toEqual(DEFAULT_ICON);
    expect(choiceFromIconName('없는_이름')).toEqual(DEFAULT_ICON);
  });

  it('기본을 빼고 18개이고, app.json에 등록한 아이콘과 똑같다', () => {
    const plugin = appJson.expo.plugins.find(
      (p) => Array.isArray(p) && p[0] === 'expo-quick-actions/icon/plugin'
    ) as [string, Record<string, { image: string }>];
    expect(allIconNames()).toHaveLength(18);
    expect(Object.keys(plugin[1]).sort()).toEqual(allIconNames());
  });
});
