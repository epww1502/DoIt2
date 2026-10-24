// 계정 코드 발급·복원. 익명 계정을 새 폰에서 다시 쓰게 해준다.
// 배포된 버전과 같은 코드다. 바꾸면 Supabase MCP deploy_edge_function 또는 supabase CLI로 다시 배포한다.
//
// 요청 본문 (로그인한 사용자의 JWT 필요)
// - { action: 'issue' }                 내 계정 코드를 새로 만든다 → { code }
//                                       (예전 코드는 더 이상 못 쓴다)
// - { action: 'restore', code: string } 코드의 계정으로 로그인 → { access_token, refresh_token }
//
// 코드는 해시만 account_codes 테이블에 저장한다.
// 복원할 때는 그 계정에 내부용 이메일과 임시 비밀번호를 붙여 로그인 세션을 만든다.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

/** 헷갈리는 글자(0/O, 1/I/L)를 뺀 글자들 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
/** 4글자씩 3묶음 (약 59비트) */
const GROUPS = 3;
const GROUP_LENGTH = 4;
const CODE_LENGTH = GROUPS * GROUP_LENGTH;

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function randomString(length: number, alphabet: string) {
  // 256이 alphabet 길이의 배수가 아니라서 치우치지 않게 넘치는 값은 버린다
  const limit = 256 - (256 % alphabet.length);
  let out = '';
  while (out.length < length) {
    for (const b of crypto.getRandomValues(new Uint8Array(length * 2))) {
      if (b < limit && out.length < length)
        out += alphabet[b % alphabet.length];
    }
  }
  return out;
}

/** 대시·공백·소문자를 정리한 코드 글자만 */
function normalize(code: string) {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

async function hash(code: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(normalize(code))
  );
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');
}

function formatCode(raw: string) {
  const parts: string[] = [];
  for (let i = 0; i < raw.length; i += GROUP_LENGTH) {
    parts.push(raw.slice(i, i + GROUP_LENGTH));
  }
  return parts.join('-');
}

async function issue(userId: string) {
  const raw = randomString(CODE_LENGTH, ALPHABET);
  const { error } = await admin.from('account_codes').upsert(
    {
      user_id: userId,
      code_hash: await hash(raw),
      created_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (error) return json({ error: 'issue_failed' }, 500);
  return json({ code: formatCode(raw) });
}

async function restore(code: unknown) {
  if (typeof code !== 'string' || normalize(code).length !== CODE_LENGTH) {
    return json({ error: 'invalid_code' }, 400);
  }
  const { data: row } = await admin
    .from('account_codes')
    .select('user_id')
    .eq('code_hash', await hash(code))
    .maybeSingle();
  if (!row) return json({ error: 'invalid_code' }, 404);

  // 내부용 이메일과 매번 새 임시 비밀번호로 로그인 세션을 만든다 (메일은 보내지 않는다)
  const email = `${row.user_id}@users.doit2.app`;
  const password = randomString(32, ALPHABET + 'abcdefghjkmnpqrstuvwxyz');
  const { error: updateError } = await admin.auth.admin.updateUserById(
    row.user_id,
    { email, password, email_confirm: true }
  );
  if (updateError) return json({ error: 'restore_failed' }, 500);

  // 로그인은 따로 만든 클라이언트로 한다 (admin 클라이언트가 이 사용자 토큰으로 바뀌지 않게)
  const signer = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { data, error } = await signer.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.session) return json({ error: 'restore_failed' }, 500);
  return json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // 게이트웨이가 JWT를 확인해 주지만, 누가 불렀는지 알려고 사용자 정보를 다시 읽는다
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const { data: auth } = await admin.auth.getUser(token);
  if (!auth.user) return json({ error: 'unauthorized' }, 401);

  let body: { action?: string; code?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_body' }, 400);
  }

  if (body.action === 'issue') return issue(auth.user.id);
  if (body.action === 'restore') return restore(body.code);
  return json({ error: 'unknown_action' }, 400);
});
