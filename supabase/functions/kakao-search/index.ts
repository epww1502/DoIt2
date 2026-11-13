// 카카오 로컬 API 프록시. 카카오 REST API 키를 앱 대신 서버에 둔다.
// 필요한 시크릿: KAKAO_REST_API_KEY (대시보드 > Edge Functions > Secrets)
// 로그인한 앱만 부르고(verify_jwt), 한 사람이 하루 500번까지 부를 수 있다 (넘으면 429 { error: 'limit' }).
// 배포된 버전과 같은 코드다. 바꾸면 Supabase MCP deploy_edge_function 또는 supabase CLI로 다시 배포한다.
//
// 요청 본문
// - { query: string }                         키워드로 장소 검색 → { places: Place[] }
// - { action: 'address', latitude, longitude } 좌표 → 주소       → { address, buildingName }
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

/** 한 사람이 하루에 부를 수 있는 횟수 (마구 불러 카카오 하루 사용량을 다 쓰지 못하게) */
const DAILY_LIMIT = 500;

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

const PAGE_SIZE = 15;
const MAX_QUERY_LENGTH = 50;

type KakaoDocument = {
  id: string;
  place_name: string;
  category_name: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
};

type KakaoAddressDocument = {
  road_address: { address_name: string; building_name: string } | null;
  address: { address_name: string } | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function lastCategory(categoryName: string) {
  const parts = categoryName.split('>').map((p) => p.trim());
  return parts[parts.length - 1] ?? '';
}

async function kakaoGet(path: string, params: URLSearchParams, key: string) {
  const res = await fetch(`https://dapi.kakao.com${path}?${params}`, {
    headers: { Authorization: `KakaoAK ${key}` },
  });
  if (!res.ok) {
    // 카카오 오류 문구를 같이 돌려준다 (예: 카카오맵 사용 설정이 꺼져 있음)
    const detail = (await res.text()).slice(0, 300);
    return {
      error: json({ error: 'kakao_error', status: res.status, detail }, 502),
    };
  }
  return { data: await res.json() };
}

async function searchKeyword(query: string, key: string) {
  if (!query || query.length > MAX_QUERY_LENGTH) {
    return json({ error: 'invalid_query' }, 400);
  }
  const params = new URLSearchParams({ query, size: String(PAGE_SIZE) });
  const { data, error } = await kakaoGet(
    '/v2/local/search/keyword.json',
    params,
    key
  );
  if (error) return error;

  const places = (data as { documents: KakaoDocument[] }).documents.map(
    (d) => ({
      kakaoId: d.id,
      name: d.place_name,
      category: lastCategory(d.category_name),
      address: d.road_address_name || d.address_name,
      latitude: Number(d.y),
      longitude: Number(d.x),
    })
  );
  return json({ places });
}

async function coordToAddress(
  latitude: number,
  longitude: number,
  key: string
) {
  const valid =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;
  if (!valid) return json({ error: 'invalid_coords' }, 400);

  // 카카오는 x=경도, y=위도
  const params = new URLSearchParams({
    x: String(longitude),
    y: String(latitude),
  });
  const { data, error } = await kakaoGet(
    '/v2/local/geo/coord2address.json',
    params,
    key
  );
  if (error) return error;

  const doc = (data as { documents: KakaoAddressDocument[] }).documents[0];
  return json({
    address:
      doc?.road_address?.address_name || doc?.address?.address_name || '',
    buildingName: doc?.road_address?.building_name || '',
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const key = Deno.env.get('KAKAO_REST_API_KEY');
  if (!key) return json({ error: 'kakao_key_missing' }, 500);

  const userId = userIdOf(req);
  if (!userId) return json({ error: 'unauthorized' }, 401);
  const { data: allowed, error: usageError } = await admin.rpc('use_ai', {
    p_user: userId,
    p_kind: 'kakao',
    p_limit: DAILY_LIMIT,
  });
  if (usageError) return json({ error: 'usage_failed' }, 500);
  if (!allowed) return json({ error: 'limit' }, 429);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_body' }, 400);
  }

  if (body?.action === 'address') {
    return coordToAddress(Number(body.latitude), Number(body.longitude), key);
  }
  const query = typeof body?.query === 'string' ? body.query.trim() : '';
  return searchKeyword(query, key);
});
