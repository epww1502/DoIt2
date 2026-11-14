/**
 * AI 도우미 (할 것 쪼개기, 분류, 문장에서 여러 개 담기, 추천).
 * Anthropic API 키가 앱에 남지 않게 Supabase Edge Function(ai)을 거쳐 부른다.
 * 키는 Supabase 대시보드 > Edge Functions > Secrets 의 ANTHROPIC_API_KEY 에 둔다.
 */
import { FunctionsHttpError } from '@supabase/supabase-js';
import { fetch as streamFetch } from 'expo/fetch';

import {
  toAiDrafts,
  toAiFill,
  toAiSuggestions,
  toAiUsage,
  type AiDraft,
  type AiFill,
  type AiSuggestion,
  type AiUsage,
} from '@/lib/bucket/aiDraft';
import {
  completeItems,
  parseStreamLine,
  splitLines,
} from '@/lib/bucket/aiStream';
import {
  functionUrl,
  supabase,
  supabasePublicKey,
} from '@/lib/supabase/client';

/** 오늘 쓸 수 있는 횟수를 다 썼을 때 */
export class AiLimitError extends Error {
  constructor() {
    super('오늘 쓸 수 있는 AI 횟수를 다 썼어요. 내일 다시 쓸 수 있어요.');
  }
}

async function callAi(body: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke<unknown>('ai', {
    body,
  });
  if (error) {
    if (error instanceof FunctionsHttpError && error.context.status === 429) {
      throw new AiLimitError();
    }
    throw error;
  }
  return data;
}

/**
 * 항목 이름만 보고 나머지(분류, 장소 이름, 지역, 할 것)를 채울 값.
 * 할 것은 이미 있는 것과 겹치지 않게, 남은 자리(room)만큼만 온다.
 */
export async function fillFromTitle(
  title: string,
  existingTodos: string[],
  room: number
): Promise<AiFill> {
  const data = await callAi({ action: 'fill', title, todos: existingTodos });
  return toAiFill(data, existingTodos, room);
}

/** 말하듯 쓴 글에서 담을 항목 여러 개 */
export async function parseItems(
  text: string,
  existing: string[]
): Promise<AiDraft[]> {
  return toAiDrafts(await callAi({ action: 'parse', text }), existing);
}

/**
 * 담아 둔 것(existing)과 어울리는 새 항목 추천 (장소와 할 것까지).
 * requests: 원하는 것을 말한 글들 (말한 순서대로). 없으면 취향만 보고 고른다
 */
export async function suggestItems(
  existing: string[],
  together: boolean,
  requests: string[] = []
): Promise<AiSuggestion[]> {
  const data = await callAi({
    action: 'suggest',
    titles: existing,
    together,
    requests,
  });
  return toAiSuggestions(data, existing);
}

/** 추천받는 동안의 진행: 어느 단계인지, 지금까지 완성된 추천 */
export type SuggestProgress = {
  stage: 'thinking' | 'writing';
  done: AiSuggestion[];
};

/** 서버가 못 만들었다고 알려 온 경우 (연결 문제가 아니라서 다시 불러도 소용없다) */
class AiAnswerError extends Error {}

/**
 * suggestItems와 같지만, 답이 쓰이는 대로 받아서 진행 상황을 알려준다 (onProgress).
 * 조금씩 받기가 안 되는 환경이거나 연결이 끊기면 한 번에 받는 방식으로 다시 부른다.
 */
export async function suggestItemsLive(
  existing: string[],
  together: boolean,
  requests: string[],
  onProgress: (progress: SuggestProgress) => void
): Promise<AiSuggestion[]> {
  try {
    return await streamSuggestions(existing, together, requests, onProgress);
  } catch (e) {
    if (e instanceof AiLimitError || e instanceof AiAnswerError) throw e;
    console.warn('[ai] stream failed, falling back', e);
    return suggestItems(existing, together, requests);
  }
}

async function streamSuggestions(
  existing: string[],
  together: boolean,
  requests: string[],
  onProgress: (progress: SuggestProgress) => void
): Promise<AiSuggestion[]> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('no_session');

  const res = await streamFetch(functionUrl('ai'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabasePublicKey,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      action: 'suggest',
      titles: existing,
      together,
      requests,
      stream: true,
    }),
  });
  if (res.status === 429) throw new AiLimitError();
  if (!res.ok) throw new AiAnswerError('ai_failed');
  // 예전 서버는 stream을 모르고 답을 한 번에 준다
  if (!res.headers.get('content-type')?.includes('ndjson') || !res.body) {
    return toAiSuggestions(await res.json(), existing);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let answer = '';
  let stage: SuggestProgress['stage'] = 'thinking';
  let count = 0;
  let finished = false;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const { lines, rest } = splitLines(buffer);
    buffer = rest;
    for (const raw of lines) {
      const line = parseStreamLine(raw);
      if (!line) continue;
      if ('error' in line) throw new AiAnswerError(line.error);
      if ('done' in line) finished = true;
      if ('stage' in line) {
        stage = line.stage;
        onProgress({ stage, done: [] });
      }
      if ('text' in line) {
        answer += line.text;
        const items = completeItems(answer);
        if (items.length !== count) {
          count = items.length;
          onProgress({
            stage: 'writing',
            done: toAiSuggestions({ items }, existing),
          });
        }
      }
    }
  }
  // 끝 표시 없이 끊겼으면 답이 온전하지 않다
  if (!finished) throw new Error('stream_cut');
  return toAiSuggestions(JSON.parse(answer), existing);
}

/** 오늘 쓴 AI 횟수와 하루 한도 (이걸 불러도 횟수는 늘지 않는다) */
export async function fetchAiUsage(): Promise<AiUsage> {
  return toAiUsage(await callAi({ action: 'usage' }));
}
