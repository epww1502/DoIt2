/**
 * AI 도우미 (할 것 쪼개기, 분류, 문장에서 여러 개 담기, 추천).
 * Anthropic API 키가 앱에 남지 않게 Supabase Edge Function(ai)을 거쳐 부른다.
 * 키는 Supabase 대시보드 > Edge Functions > Secrets 의 ANTHROPIC_API_KEY 에 둔다.
 */
import { FunctionsHttpError } from '@supabase/supabase-js';

import {
  toAiClass,
  toAiDrafts,
  toAiTodoTexts,
  type AiClass,
  type AiDraft,
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

/** 항목 이름을 보고 새로 넣을 할 것들 (이미 있는 것과 겹치지 않게, 남은 자리만큼) */
export async function splitIntoTodos(
  title: string,
  existing: string[],
  room: number
): Promise<string[]> {
  const data = await callAi({ action: 'split', title, todos: existing });
  return toAiTodoTexts(data, existing, room);
}

/** 항목 이름의 종류·카테고리·실내외. 못 고르면 null */
export async function classifyTitle(title: string): Promise<AiClass | null> {
  return toAiClass(await callAi({ action: 'classify', title }));
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
