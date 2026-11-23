// 앱 안에서 보낸 문의를 저장하고 관리자에게 푸시 알림을 보낸다 (도움말 > 문의하기).
// 배포된 버전과 같은 코드다. 바꾸면 Supabase MCP deploy_edge_function 또는 supabase CLI로 다시 배포한다.
//
// 요청 본문: { message: string, contact?: string, platform?: string, appVersion?: string }
// 응답: { ok: true } | { error: 'empty' | 'too_long' | 'too_many' | ... }
//
// 한 계정이 하루에 보낼 수 있는 수를 제한한다 (도배 막기). 관리자는 app_admins 표에 있는 계정이다.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const MAX_MESSAGE = 1000;
const MAX_CONTACT = 100;
const MAX_PER_DAY = 5;
const DAY_MS = 24 * 60 * 60 * 1000;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

type Body = {
  message?: unknown;
  contact?: unknown;
  platform?: unknown;
  appVersion?: unknown;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const text = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

/**
 * 관리자들의 폰에 알린다. 실패해도 문의는 이미 저장됐으니 조용히 넘어간다.
 * 문의 내용은 넣지 않는다: 잠금 화면에 PIN 없이 보이고 푸시 서버(Expo·Apple·Google)도 거치기 때문이다.
 * 내용은 관리자 모드(PIN)를 연 뒤 앱 안에서만 본다.
 */
async function notifyAdmins() {
  const { data: admins } = await admin.from('app_admins').select('user_id');
  const ids = (admins ?? []).map((a) => a.user_id);
  if (!ids.length) return;
  const { data: tokens } = await admin
    .from('push_tokens')
    .select('token')
    .in('user_id', ids);
  if (!tokens?.length) return;

  const messages = tokens.map((t) => ({
    to: t.token,
    title: '새 문의가 왔어요',
    body: '관리자 모드에서 확인해 주세요',
    sound: 'default',
    channelId: 'default',
    // 누르면 문의 목록으로
    data: { screen: 'inquiries' },
  }));
  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });
  const result = (await res.json().catch(() => null)) as {
    data?: { status: string; details?: { error?: string } }[];
  } | null;
  // 앱을 지운 폰의 토큰은 정리한다
  const stale = messages
    .filter(
      (_, i) => result?.data?.[i]?.details?.error === 'DeviceNotRegistered'
    )
    .map((m) => m.to);
  if (stale.length) {
    await admin.from('push_tokens').delete().in('token', stale);
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const { data: auth } = await admin.auth.getUser(token);
  const userId = auth.user?.id;
  if (!userId) return json({ error: 'unauthorized' }, 401);

  const body = (await req.json().catch(() => ({}))) as Body;
  if (typeof body.message !== 'string') return json({ error: 'empty' }, 400);
  const message = body.message.trim();
  if (!message) return json({ error: 'empty' }, 400);
  if (message.length > MAX_MESSAGE) return json({ error: 'too_long' }, 400);

  const since = new Date(Date.now() - DAY_MS).toISOString();
  const { count, error: countError } = await admin
    .from('inquiries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);
  if (countError) return json({ error: 'server' }, 500);
  if ((count ?? 0) >= MAX_PER_DAY) return json({ error: 'too_many' }, 429);

  const { error } = await admin.from('inquiries').insert({
    user_id: userId,
    message,
    contact: text(body.contact, MAX_CONTACT) || null,
    platform: text(body.platform, 20) || null,
    app_version: text(body.appVersion, 20) || null,
  });
  if (error) {
    console.error('inquiry insert failed', error.message);
    return json({ error: 'server' }, 500);
  }

  await notifyAdmins().catch((e) => console.error('inquiry push failed', e));
  return json({ ok: true });
});
