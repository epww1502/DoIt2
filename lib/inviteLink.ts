/** 초대 링크가 열리는 웹 페이지 (site/join.html). 앱이 있으면 앱으로, 없으면 설치 안내로 이어진다 */
const JOIN_URL = 'https://doit2app.github.io/join.html';

type InviteSpace = { name: string; emoji: string; invite_code: string };

/**
 * 공간 초대 링크. 공간 이름과 이모지는 받는 사람 화면에 보여주려고 주소에 같이 싣는다.
 * (웹 페이지는 서버에서 공간을 읽지 않는다. 코드만으로 남의 공간 정보를 볼 수 없게 하려고)
 */
export function inviteLink(space: InviteSpace) {
  const query = [
    ['c', space.invite_code],
    ['s', space.name],
    ['e', space.emoji],
  ]
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  return `${JOIN_URL}?${query}`;
}

/** 메신저로 보내는 초대 글. 링크를 못 여는 사람도 들어올 수 있게 코드도 같이 적는다 */
export function inviteMessage(space: InviteSpace) {
  return `DoIt2에서 '${space.name}' 버킷리스트 같이 쓰자 ${space.emoji}\n${inviteLink(space)}\n초대 코드: ${space.invite_code}`;
}

/** 초대 링크로 들어온 코드를 입력칸에 넣을 모양으로 (영문 대문자·숫자 6자리까지) */
export function cleanInviteCode(raw: string | string[] | undefined) {
  const text = Array.isArray(raw) ? raw[0] : raw;
  return (text ?? '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 6);
}
