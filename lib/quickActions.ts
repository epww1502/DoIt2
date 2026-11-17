/**
 * 홈 화면에서 앱 아이콘을 꾹 눌렀을 때 나오는 바로가기 (새 빌드부터).
 * 바로가기 모듈이 없는 예전 빌드에서는 아무 일도 하지 않는다.
 */
import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

export type QuickAction = {
  id: string;
  title: string;
  /** 아이폰은 기본 아이콘 이름, 안드로이드는 app.json의 androidIcons 이름 */
  icon: string;
  params: { href: string };
};

/** 바로가기 목록 (위에서부터). 누르면 href 화면으로 간다 */
export function quickActionItems(os: string = Platform.OS): QuickAction[] {
  const icon = (ios: string, android: string) => (os === 'ios' ? ios : android);
  return [
    {
      id: 'add',
      title: '새로 담기',
      icon: icon('add', 'shortcut_add'),
      params: { href: '/item/new' },
    },
    {
      id: 'pick',
      title: '오늘 뭐 하지',
      icon: icon('shuffle', 'shortcut_pick'),
      params: { href: '/pick' },
    },
    {
      id: 'done',
      title: '일지 보기',
      icon: icon('bookmark', 'shortcut_done'),
      params: { href: '/done' },
    },
  ];
}

/** 눌린 바로가기에서 갈 화면 주소 (우리가 만든 바로가기가 아니면 null) */
export function quickActionHref(action: unknown): string | null {
  const href = (action as { params?: { href?: unknown } } | null)?.params?.href;
  if (typeof href !== 'string') return null;
  return quickActionItems('ios').some((item) => item.params.href === href)
    ? href
    : null;
}

/** 이 빌드에 바로가기 모듈이 있는지 */
export function quickActionsAvailable() {
  return requireOptionalNativeModule('ExpoQuickActions') !== null;
}
