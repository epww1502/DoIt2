/**
 * 공유로 담기 (새 빌드부터): 다른 앱에서 '공유 → DoIt2'로 넘어온 글·링크를 담기 화면에 채울 모양으로 바꾼다.
 * 지도 앱 공유 글(이름 + 주소 + 링크)은 담기 화면이 원래 하던 대로 장소까지 찾아 채운다.
 */
import { parseMapShare } from '@/lib/bucket/mapShare';

export type SharedContent = {
  text?: string | null;
  webUrl?: string | null;
  meta?: { title?: string | null } | null;
};

export type SharedPrefill = {
  /** 지도 앱 공유 글이면 그 글 전체 (담기 화면이 장소를 찾는 데 쓴다) */
  mapText: string | null;
  /** 이름 칸에 넣을 글 (없으면 빈 글자) */
  title: string;
  /** 링크로 붙일 주소와 그 제목 */
  url: string | null;
  linkTitle: string | null;
};

const TITLE_MAX = 40;
const URL_PATTERN = /https?:\/\/[^\s]+/g;

const firstLine = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean) ?? '';

/** 공유받은 것에서 담기 화면에 채울 것. 쓸 게 없으면 null */
export function sharedPrefill(content: SharedContent): SharedPrefill | null {
  const text = (content.text ?? '').trim();
  const url =
    (content.webUrl ?? '').trim() || (text.match(URL_PATTERN)?.[0] ?? '');
  const pageTitle = (content.meta?.title ?? '').trim();
  if (!text && !url) return null;

  if (text && parseMapShare(text)) {
    return { mapText: text, title: '', url: null, linkTitle: null };
  }
  // 글에서 링크를 뺀 첫 줄, 없으면 페이지 제목
  const plain = firstLine(text.replace(URL_PATTERN, ' '));
  const title = (plain || pageTitle).slice(0, TITLE_MAX);
  return {
    mapText: null,
    title,
    url: url || null,
    linkTitle: url ? pageTitle || plain || null : null,
  };
}

/** 담기 화면으로 넘길 값 (주소에 실리므로 글자만) */
export function sharedParams(prefill: SharedPrefill) {
  return {
    ...(prefill.mapText ? { sharedMap: prefill.mapText.slice(0, 600) } : {}),
    ...(prefill.title ? { sharedTitle: prefill.title } : {}),
    ...(prefill.url ? { sharedUrl: prefill.url.slice(0, 600) } : {}),
    ...(prefill.linkTitle
      ? { sharedLinkTitle: prefill.linkTitle.slice(0, 80) }
      : {}),
  };
}
