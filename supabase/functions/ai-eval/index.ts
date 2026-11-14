// AI 평가용 심사 (scripts/ai-eval). 추천을 만든 모델과 다른 모델에게 채점을 시킨다.
// 평가 계정만 부를 수 있다: 로그인 계정의 app_metadata.ai_eval 이 true 여야 한다
// (app_metadata는 서버만 바꿀 수 있다. 평가 계정을 만든 뒤 SQL로 켠다. scripts/ai-eval/README.md 참고).
// 필요한 시크릿: ANTHROPIC_API_KEY (ai 함수와 같은 키)
// 배포된 버전과 같은 코드다. 바꾸면 Supabase MCP deploy_edge_function 또는 supabase CLI로 다시 배포한다.
//
// 요청 본문: { system, user, schema, model? }
//   → { text, model, usage, stop_reason }  (text는 schema 모양의 JSON 글자)
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';

/** 심사에 쓸 수 있는 모델 (추천을 만드는 모델은 넣지 않는다) */
const JUDGE_MODELS = ['claude-sonnet-5-5', 'claude-opus-5-5'];
const MAX_INPUT = 20000;

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

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'ai_key_missing' }, 500);

  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const { data: auth } = await admin.auth.getUser(token);
  if (!auth.user) return json({ error: 'unauthorized' }, 401);
  if (auth.user.app_metadata?.ai_eval !== true) {
    return json({ error: 'forbidden' }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_body' }, 400);
  }
  const system = typeof body.system === 'string' ? body.system : '';
  const user = typeof body.user === 'string' ? body.user : '';
  const schema = body.schema;
  const model =
    typeof body.model === 'string' && JUDGE_MODELS.includes(body.model)
      ? body.model
      : JUDGE_MODELS[0];
  if (
    !system ||
    !user ||
    !schema ||
    typeof schema !== 'object' ||
    system.length + user.length > MAX_INPUT
  ) {
    return json({ error: 'invalid_request' }, 400);
  }

  try {
    const response = await new Anthropic({ apiKey }).messages.create({
      model,
      max_tokens: 4000,
      system,
      messages: [{ role: 'user', content: user }],
      output_config: {
        effort: 'medium',
        format: {
          type: 'json_schema',
          schema: schema as Record<string, unknown>,
        },
      },
    });
    const block = response.content.find((b) => b.type === 'text');
    return json({
      text: block && block.type === 'text' ? block.text : '',
      model: response.model,
      usage: response.usage,
      stop_reason: response.stop_reason,
    });
  } catch (e) {
    console.error('[ai-eval]', e);
    return json({ error: 'ai_failed' }, 502);
  }
});
