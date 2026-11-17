import { joinRouteFromUrl } from '@/lib/inviteLink';

/**
 * 앱 밖의 주소로 앱이 열렸을 때, 그 주소를 앱 안의 화면 주소로 바꾼다 (expo-router가 부른다).
 * 초대 링크(https://doit2app.github.io/join.html?c=…)는 초대 코드 화면으로 보낸다.
 * 그 밖의 주소(doit2://… 등)는 그대로 둔다.
 */
export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}) {
  try {
    return joinRouteFromUrl(path) ?? path;
  } catch {
    return path;
  }
}
