import { getShareExtensionKey } from 'expo-share-intent';

import { joinRouteFromUrl } from '@/lib/inviteLink';
import { trackStep } from '@/lib/steps';

/**
 * 앱 밖의 주소로 앱이 열렸을 때, 그 주소를 앱 안의 화면 주소로 바꾼다 (expo-router가 부른다).
 * 초대 링크(https://doit2app.github.io/join.html?c=…)는 초대 코드 화면으로 보낸다.
 * 다른 앱에서 공유로 열렸을 때의 주소는 첫 화면으로 돌린다 (expo-share-intent).
 * 그 밖의 주소(doit2://… 등)는 그대로 둔다.
 */
export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}) {
  try {
    // 공유로 담기: 공유받은 내용은 ShareInSync가 꺼내서 담기 화면을 연다. 여기서는 첫 화면으로만 보낸다
    if (path.includes(`dataUrl=${getShareExtensionKey()}`)) return '/';
    // 어떤 길로 앱이 열렸는지 센다 (새 빌드에서 넣은 기능이 쓰이는지 보려고)
    if (path.includes('from=widget')) trackStep('widget_open');
    const join = joinRouteFromUrl(path);
    if (join && /^https?:/.test(path)) trackStep('invite_link_open', 'link');
    // 초대 웹 페이지의 '앱에서 열기' 버튼 (doit2://space/join?code=…)
    else if (/space\/join\?code=/.test(path)) {
      trackStep('invite_link_open', 'web');
    }
    return join ?? path;
  } catch {
    return path;
  }
}
