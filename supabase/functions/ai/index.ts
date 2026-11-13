// AI 도우미 (Claude). Anthropic API 키를 앱 대신 서버에 두고, 사람마다 하루 횟수를 제한한다.
// 필요한 시크릿: ANTHROPIC_API_KEY (대시보드 > Edge Functions > Secrets)
// 배포된 버전과 같은 코드다. 바꾸면 Supabase MCP deploy_edge_function 또는 supabase CLI로 다시 배포한다.
//
// 요청 본문 (로그인한 사용자의 JWT 필요)
// - { action: 'split', title, todos?: string[] }   항목을 할 것으로 쪼갠다 → { todos: string[] }
// - { action: 'classify', title }                  종류·카테고리·실내외 → { kind, category, setting }
// - { action: 'parse', text }                      문장에서 항목 여러 개 → { items: Draft[] }
// - { action: 'suggest', titles: string[], together: boolean }
//                                                  담아 둔 것과 어울리는 새 항목 → { items: Draft[] }
//   Draft = { title, kind, category, setting }
//
// 하루 한도(한국 날짜)를 넘으면 429 { error: 'limit' }.
// 답의 모양은 앱(lib/bucket/aiDraft.ts)이 한 번 더 걸러서 쓴다.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';

const MODEL = 'claude-haiku-5-5';
/** 눌러서 쓰는 기능(쪼개기·여러 개 담기·추천)의 하루 횟수 */
const DAILY_LIMIT = 20;
/** 담을 때 저절로 되는 분류의 하루 횟수 */
const DAILY_AUTO_LIMIT = 60;

const MAX_TITLE = 40;
const MAX_TEXT = 500;
const MAX_TITLES = 60;

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

const CATEGORY_GUIDE = `항목의 모양:
- kind: place(가보고 싶은 장소) 또는 activity(해보고 싶은 일)
- category: kind가 place면 food(맛집) cafe(카페) trip(여행) activity(액티비티) culture(문화생활) etc(기타) 중 하나,
  kind가 activity면 cook(요리) exercise(운동) hobby(취미/만들기) memory(추억 남기기) event(이벤트) etc(기타) 중 하나
- setting: indoor(실내) 또는 outdoor(실외). 비 오는 날 해도 되면 indoor
- title: 40자 이하의 짧은 한국어 이름 (예: "성수동 파스타집 가기", "같이 생파스타 만들기")`;

const DRAFT_PROPERTIES = {
  kind: { type: 'string', enum: ['place', 'activity'] },
  category: {
    type: 'string',
    enum: [
      'food',
      'cafe',
      'trip',
      'activity',
      'culture',
      'cook',
      'exercise',
      'hobby',
      'memory',
      'event',
      'etc',
    ],
  },
  setting: { type: 'string', enum: ['indoor', 'outdoor'] },
};

const DRAFTS_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: { title: { type: 'string' }, ...DRAFT_PROPERTIES },
        required: ['title', 'kind', 'category', 'setting'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
};

type Job = {
  usage: 'ai' | 'auto';
  limit: number;
  effort: 'low' | 'medium';
  system: string;
  user: string;
  schema: Record<string, unknown>;
};

const text = (v: unknown, max: number) =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

/** 요청을 확인하고 Claude에게 시킬 일로 바꾼다. 잘못된 요청이면 null */
function toJob(body: Record<string, unknown>): Job | null {
  if (body.action === 'split') {
    const title = text(body.title, MAX_TITLE);
    if (!title) return null;
    const todos = Array.isArray(body.todos)
      ? body.todos
          .map((t) => text(t, 60))
          .filter(Boolean)
          .slice(0, 30)
      : [];
    return {
      usage: 'ai',
      limit: DAILY_LIMIT,
      effort: 'low',
      system:
        '함께 쓰는 버킷리스트 앱의 도우미다. 버킷리스트 항목 하나를 실제로 해내기 위한 할 것 체크리스트로 쪼갠다. ' +
        '할 것은 3~7개, 하는 순서대로, 각각 30자 이하의 짧은 한국어로 쓴다. 이미 있는 할 것과 겹치는 건 빼고 새 것만 쓴다.',
      user: `항목: ${title}\n이미 있는 할 것: ${todos.length > 0 ? todos.join(', ') : '없음'}`,
      schema: {
        type: 'object',
        properties: { todos: { type: 'array', items: { type: 'string' } } },
        required: ['todos'],
        additionalProperties: false,
      },
    };
  }

  if (body.action === 'classify') {
    const title = text(body.title, MAX_TITLE);
    if (!title) return null;
    return {
      usage: 'auto',
      limit: DAILY_AUTO_LIMIT,
      effort: 'low',
      system: `함께 쓰는 버킷리스트 앱의 도우미다. 항목 이름을 보고 분류한다.\n${CATEGORY_GUIDE}`,
      user: `항목: ${title}`,
      schema: {
        type: 'object',
        properties: DRAFT_PROPERTIES,
        required: ['kind', 'category', 'setting'],
        additionalProperties: false,
      },
    };
  }

  if (body.action === 'parse') {
    const sentence = text(body.text, MAX_TEXT);
    if (!sentence) return null;
    return {
      usage: 'ai',
      limit: DAILY_LIMIT,
      effort: 'low',
      system:
        '함께 쓰는 버킷리스트 앱의 도우미다. 사용자가 말하듯 쓴 글에서 하고 싶은 것·가고 싶은 곳을 하나씩 나눠 항목으로 만든다. ' +
        `글에 없는 것은 지어내지 않는다. 최대 10개.\n${CATEGORY_GUIDE}`,
      user: sentence,
      schema: DRAFTS_SCHEMA,
    };
  }

  if (body.action === 'suggest') {
    const titles = Array.isArray(body.titles)
      ? body.titles
          .map((t) => text(t, MAX_TITLE))
          .filter(Boolean)
          .slice(0, MAX_TITLES)
      : [];
    const month = new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCMonth() + 1;
    return {
      usage: 'ai',
      limit: DAILY_LIMIT,
      effort: 'medium',
      system:
        '함께 쓰는 버킷리스트 앱의 도우미다. 사용자가 담아 둔 버킷리스트를 보고 취향에 맞는 새 항목 5개를 추천한다. ' +
        '이미 담아 둔 것과 겹치지 않게, 한국에서 실제로 할 수 있고 지금 계절에 어울리는 것으로 고른다. ' +
        `특정 가게 이름은 지어내지 말고 동네·종류로 쓴다 (예: "을지로 노포 투어").\n${CATEGORY_GUIDE}`,
      user:
        `지금은 ${month}월이고, ${body.together === true ? '여럿이 함께 쓰는 목록' : '혼자 쓰는 목록'}이다.\n` +
        `담아 둔 것: ${titles.length > 0 ? titles.join(', ') : '아직 없음'}`,
      schema: DRAFTS_SCHEMA,
    };
  }

  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'ai_key_missing' }, 500);

  // 게이트웨이가 JWT를 확인해 주지만, 누가 불렀는지 알려고 사용자 정보를 다시 읽는다
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const { data: auth } = await admin.auth.getUser(token);
  if (!auth.user) return json({ error: 'unauthorized' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_body' }, 400);
  }
  const job = toJob(body ?? {});
  if (!job) return json({ error: 'invalid_request' }, 400);

  // ponytail: Claude를 부르기 전에 센다 (실패한 요청도 횟수에 들어간다).
  // 한도가 넉넉해서 괜찮고, 실패를 되돌려 주려면 여기서 올린 횟수를 다시 내리면 된다.
  const { data: allowed, error: usageError } = await admin.rpc('use_ai', {
    p_user: auth.user.id,
    p_kind: job.usage,
    p_limit: job.limit,
  });
  if (usageError) return json({ error: 'usage_failed' }, 500);
  if (!allowed) return json({ error: 'limit' }, 429);

  try {
    const response = await new Anthropic({ apiKey }).messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: job.system,
      messages: [{ role: 'user', content: job.user }],
      output_config: {
        effort: job.effort,
        format: { type: 'json_schema', schema: job.schema },
      },
    });
    // 거절했거나 중간에 끊겼으면 JSON이 온전하지 않다
    if (response.stop_reason !== 'end_turn') {
      return json({ error: 'ai_failed', reason: response.stop_reason }, 502);
    }
    const block = response.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') {
      return json({ error: 'ai_failed' }, 502);
    }
    return json(JSON.parse(block.text));
  } catch (e) {
    console.error('[ai]', e);
    return json({ error: 'ai_failed' }, 502);
  }
});
