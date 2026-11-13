// 링크 미리보기: 페이지의 제목·사진·사이트 이름을 받아 온다 (og 태그, 없으면 <title>).
// 로그인한 앱만 부르고(verify_jwt), 한 사람이 하루 200번까지 부를 수 있다 (넘으면 429 { error: 'limit' }).
// 내부망 주소는 받지 않는다: 호스트 이름과 그 이름이 가리키는 IP를 보고, 넘어가는 주소마다 다시 본다.
// 배포된 버전과 같은 코드다.
// 바꾸면 Supabase MCP deploy_edge_function 또는 supabase CLI로 다시 배포한다.
//
// 요청 본문: { url: string } → { title, image, site, url } (못 찾은 건 null)
// url: 짧은 링크(naver.me 등)를 따라간 마지막 주소
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

/** 한 사람이 하루에 부를 수 있는 횟수 (서버를 대신 접속하는 통로로 쓰지 못하게) */
const DAILY_LIMIT = 200;
/** 짧은 링크를 따라가는 횟수 */
const MAX_REDIRECTS = 5;

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

/** 로그인 토큰에서 사용자 id를 읽는다. 서명은 게이트웨이(verify_jwt)가 이미 확인했다 */
function userIdOf(req: Request): string | null {
  try {
    const token =
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const sub = JSON.parse(atob(payload)).sub;
    return typeof sub === 'string' && sub ? sub : null;
  } catch {
    return null;
  }
}

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

/** 내부망 IPv6 주소인지 (::1, fc00::/7, fe80::/10, IPv4를 감싼 주소) */
function isPrivateV6(address: string) {
  const a = address.toLowerCase();
  return (
    a === '::' ||
    a === '::1' ||
    a.startsWith('fc') ||
    a.startsWith('fd') ||
    a.startsWith('fe8') ||
    a.startsWith('fe9') ||
    a.startsWith('fea') ||
    a.startsWith('feb') ||
    a.includes('::ffff:')
  );
}

/**
 * 받아도 되는 주소인지: http(s)이고, 호스트 이름도, 그 이름이 실제로 가리키는 IP도 내부망이 아니어야 한다.
 * 이름만 보면 내부 IP를 가리키는 도메인(예: 10.0.0.5.nip.io)을 못 막는다.
 * ponytail: 확인한 뒤 접속할 때 DNS 답이 바뀌는 경우(리바인딩)까지는 못 막는다. 막으려면 확인한 IP로 직접 접속해야 한다.
 */
async function isAllowedUrl(url: URL) {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  if (isPrivateHost(url.hostname)) return false;
  // IP를 그대로 쓴 주소는 위에서 봤다
  if (/^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)) return true;
  try {
    const [v4, v6] = await Promise.all([
      Deno.resolveDns(url.hostname, 'A').catch(() => [] as string[]),
      Deno.resolveDns(url.hostname, 'AAAA').catch(() => [] as string[]),
    ]);
    return !v4.some(isPrivateHost) && !v6.some(isPrivateV6);
  } catch {
    // 이 실행 환경에서 DNS를 못 물어보면 이름 검사만으로 넘어간다
    return true;
  }
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
  if (raw.length > MAX_URL_LENGTH || !(await isAllowedUrl(url))) {
    return json({ error: 'invalid_url' }, 400);
  }

  const userId = userIdOf(req);
  if (!userId) return json({ error: 'unauthorized' }, 401);
  const { data: allowed, error: usageError } = await admin.rpc('use_ai', {
    p_user: userId,
    p_kind: 'link',
    p_limit: DAILY_LIMIT,
  });
  if (usageError) return json({ error: 'usage_failed' }, 500);
  if (!allowed) return json({ error: 'limit' }, 429);

  // 넘어가는 주소(리디렉션)를 저절로 따라가지 않고 한 걸음씩 검사하며 따라간다.
  // 저절로 따라가면 내부망 주소로 넘기는 링크에 이미 접속한 뒤에야 알게 된다.
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let finalUrl = url;
  let res: Response;
  try {
    for (let hop = 0; ; hop++) {
      res = await fetch(finalUrl, {
        redirect: 'manual',
        signal,
        headers: {
          // 일부 사이트는 브라우저가 아니면 og 태그를 안 준다
          'User-Agent': 'Mozilla/5.0 (compatible; DoIt2LinkPreview/1.0)',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.5',
        },
      });
      const next = res.headers.get('location');
      if (res.status < 300 || res.status >= 400 || !next) break;
      void res.body?.cancel().catch(() => {});
      const nextUrl = new URL(next, finalUrl);
      if (hop >= MAX_REDIRECTS || !(await isAllowedUrl(nextUrl))) {
        return json({ title: null, image: null, site: null, url: null });
      }
      finalUrl = nextUrl;
    }
  } catch {
    return json({ title: null, image: null, site: null, url: null });
  }
  const contentType = res.headers.get('content-type') ?? '';
  const at = finalUrl.toString().slice(0, MAX_URL_LENGTH);
  // 막혀도(429 등) 따라간 주소는 쓸모 있다 (지도 링크의 검색어)
  if (!res.ok) {
    void res.body?.cancel().catch(() => {});
    return json({ title: null, image: null, site: null, url: at });
  }
  // 사진 링크면 그 사진을 그대로 미리보기로
  if (contentType.startsWith('image/')) {
    void res.body?.cancel().catch(() => {});
    return json({ title: null, image: at, site: null, url: at });
  }
  if (!contentType.includes('html')) {
    void res.body?.cancel().catch(() => {});
    return json({ title: null, image: null, site: null, url: at });
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
  return json({ title, image, site, url: at });
});
