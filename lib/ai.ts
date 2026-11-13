/**
 * AI 도우미 (할 것 쪼개기, 분류, 문장에서 여러 개 담기, 추천).
 * Anthropic API 키가 앱에 남지 않게 Supabase Edge Function(ai)을 거쳐 부른다.
 * 키는 Supabase 대시보드 > Edge Functions > Secrets 의 ANTHROPIC_API_KEY 에 둔다.
 */
import { FunctionsHttpError } from '@supabase/supabase-js';

import {
  toAiDrafts,
  toAiFill,
  toAiUsage,
  type AiDraft,
  type AiFill,
  type AiUsage,
} from '@/lib/bucket/aiDraft';
import { supabase } from '@/lib/supabase/client';

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

/** 담아 둔 것(existing)과 어울리는 새 항목 추천 */
export async function suggestItems(
  existing: string[],
  together: boolean
): Promise<AiDraft[]> {
  const data = await callAi({ action: 'suggest', titles: existing, together });
  return toAiDrafts(data, existing);
}

/** 오늘 쓴 AI 횟수와 하루 한도 (이걸 불러도 횟수는 늘지 않는다) */
export async function fetchAiUsage(): Promise<AiUsage> {
  return toAiUsage(await callAi({ action: 'usage' }));
}
