// 링크 미리보기: 페이지의 제목·사진·사이트 이름을 받아 온다 (og 태그, 없으면 <title>).
// 로그인한 앱만 부른다 (verify_jwt). 배포된 버전과 같은 코드다.
// 바꾸면 Supabase MCP deploy_edge_function 또는 supabase CLI로 다시 배포한다.
//
// 요청 본문: { url: string } → { title, image, site } (못 찾은 건 null)
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const TIMEOUT_MS = 6000;
/** 제목·사진은 문서 앞쪽 <head>에 있다. 그 이상은 읽지 않는다 */
const MAX_BYTES = 512 * 1024;
const MAX_URL_LENGTH = 2000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** 내부망 주소는 받지 않는다 */
function isPrivateHost(host: string) {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local')) {
    return true;
  }
  if (h.includes(':')) return true; // IPv6 주소는 통째로 막는다
  const v4 = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!v4) return false;
  const [a, b] = [Number(v4[1]), Number(v4[2])];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

function decodeEntities(text: string) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCodePoint(parseInt(h, 16))
    )
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function clean(text: string | undefined, max: number) {
  if (!text) return null;
  const t = decodeEntities(text).replace(/\s+/g, ' ').trim();
  if (!t) return null;
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

/** <meta property="og:title" content="..."> (속성 순서는 아무거나) */
function metaContent(html: string, names: string[]) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!key || !names.includes(key.toLowerCase())) continue;
    const content = tag.match(
      /\bcontent\s*=\s*"([^"]*)"|\bcontent\s*=\s*'([^']*)'/i
    );
    const value = content?.[1] ?? content?.[2];
    if (value?.trim()) return value;
  }
  return undefined;
}

/** 앞부분만 읽는다 */
async function readHead(res: Response) {
  const reader = res.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    size += value.length;
  }
  void reader.cancel().catch(() => {});
  const out = new Uint8Array(Math.min(size, MAX_BYTES));
  let at = 0;
  for (const c of chunks) {
    const part = c.subarray(0, out.length - at);
    out.set(part, at);
    at += part.length;
    if (at >= out.length) break;
  }
  return out;
}

/** 글자 인코딩 (예전 한국 사이트는 euc-kr이 있다) */
function decode(bytes: Uint8Array, contentType: string) {
  const ascii = new TextDecoder('latin1').decode(bytes.subarray(0, 4096));
  const charset = (
    contentType.match(/charset=([\w-]+)/i)?.[1] ??
    ascii.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1] ??
    'utf-8'
  ).toLowerCase();
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let body: { url?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_body' }, 400);
  }
  const raw = typeof body?.url === 'string' ? body.url.trim() : '';
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return json({ error: 'invalid_url' }, 400);
  }
  if (
    raw.length > MAX_URL_LENGTH ||
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    isPrivateHost(url.hostname)
  ) {
    return json({ error: 'invalid_url' }, 400);
  }

  let res: Response;
  try {
    res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        // 일부 사이트는 브라우저가 아니면 og 태그를 안 준다
        'User-Agent': 'Mozilla/5.0 (compatible; DoIt2LinkPreview/1.0)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.5',
      },
    });
  } catch {
    return json({ title: null, image: null, site: null });
  }
  const finalUrl = new URL(res.url || url.toString());
  const contentType = res.headers.get('content-type') ?? '';
  if (!res.ok || isPrivateHost(finalUrl.hostname)) {
    void res.body?.cancel().catch(() => {});
    return json({ title: null, image: null, site: null });
  }
  // 사진 링크면 그 사진을 그대로 미리보기로
  if (contentType.startsWith('image/')) {
    void res.body?.cancel().catch(() => {});
    return json({ title: null, image: finalUrl.toString(), site: null });
  }
  if (!contentType.includes('html')) {
    void res.body?.cancel().catch(() => {});
    return json({ title: null, image: null, site: null });
  }

  const html = decode(await readHead(res), contentType);
  const title = clean(
    metaContent(html, ['og:title', 'twitter:title']) ??
      html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1],
    120
  );
  const site = clean(metaContent(html, ['og:site_name']), 40);
  let image: string | null = null;
  const rawImage = metaContent(html, [
    'og:image',
    'og:image:url',
    'og:image:secure_url',
    'twitter:image',
    'twitter:image:src',
  ]);
  if (rawImage) {
    try {
      const resolved = new URL(decodeEntities(rawImage.trim()), finalUrl);
      // 앱(iOS)은 http 사진을 막는다
      if (resolved.protocol === 'http:') resolved.protocol = 'https:';
      if (
        resolved.protocol === 'https:' &&
        resolved.toString().length <= 1000
      ) {
        image = resolved.toString();
      }
    } catch {
      image = null;
    }
  }
  return json({ title, image, site });
});
