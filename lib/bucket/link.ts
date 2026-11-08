import type { ItemLink } from './types';

/**
 * 입력한 글자 → 열 수 있는 링크 주소 (아니면 null).
 * 'naver.me/abc'처럼 앞을 빼고 붙여도 https://를 붙인다. 글 사이에 섞인 주소도 골라낸다
 * (예: 공유하기로 복사한 "가게 이름 https://..." ).
 */
export function normalizeUrl(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const found = trimmed.match(/https?:\/\/[^\s<>"']+/i)?.[0];
  const candidate = found ?? (/\s/.test(trimmed) ? null : trimmed);
  if (!candidate) return null;
  const withScheme = /^https?:\/\//i.test(candidate)
    ? candidate
    : `https://${candidate}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    // 점이 없는 이름(예: 'hello')은 주소로 보지 않는다
    if (!url.hostname.includes('.')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** 'https://www.instagram.com/p/xx' → 'instagram.com' */
export function linkHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** 카드에 보일 제목 (없으면 사이트 주소) */
export function linkLabel(link: ItemLink) {
  return link.title?.trim() || linkHost(link.url);
}
