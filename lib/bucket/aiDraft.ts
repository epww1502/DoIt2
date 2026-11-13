/**
 * AI(서버 ai 함수)가 준 답을 앱에서 쓸 모양으로 거른다.
 * 서버가 모양을 맞춰 주지만 그대로 믿지 않는다: 모르는 값·너무 긴 글·겹치는 것은 여기서 빼거나 고친다.
 */
import {
  CATEGORIES_BY_KIND,
  type BucketInput,
  type BucketKind,
  type BucketSetting,
  type CategoryKey,
} from '@/lib/bucket/types';

const MAX_TITLE = 40;
const MAX_TODO_TEXT = 60;
const MAX_DRAFTS = 10;

export type AiClass = {
  kind: BucketKind;
  category: CategoryKey;
  setting: BucketSetting;
};

/** AI가 만든 담을 항목 (이름과 분류만) */
export type AiDraft = AiClass & { title: string };

const record = (v: unknown) =>
  v && typeof v === 'object' ? (v as Record<string, unknown>) : {};

const sameText = (s: string) => s.replace(/\s+/g, '').toLowerCase();

/** 종류·카테고리·실내외. 종류를 모르면 null, 그 종류에 없는 카테고리는 '기타'로 */
export function toAiClass(raw: unknown): AiClass | null {
  const { kind, category, setting } = record(raw);
  if (kind !== 'place' && kind !== 'activity') return null;
  return {
    kind,
    category: CATEGORIES_BY_KIND[kind].some((c) => c.key === category)
      ? (category as CategoryKey)
      : 'etc',
    setting: setting === 'outdoor' ? 'outdoor' : 'indoor',
  };
}

/** 담을 항목들. 이미 담아 둔 이름(existing)이나 서로 겹치는 것은 뺀다 */
export function toAiDrafts(raw: unknown, existing: string[] = []): AiDraft[] {
  const items = record(raw).items;
  if (!Array.isArray(items)) return [];
  const seen = new Set(existing.map(sameText));
  const drafts: AiDraft[] = [];
  for (const item of items) {
    const cls = toAiClass(item);
    const rawTitle = record(item).title;
    const title =
      typeof rawTitle === 'string' ? rawTitle.trim().slice(0, MAX_TITLE) : '';
    if (!cls || !title || seen.has(sameText(title))) continue;
    seen.add(sameText(title));
    drafts.push({ ...cls, title });
    if (drafts.length >= MAX_DRAFTS) break;
  }
  return drafts;
}

/** 새로 넣을 할 것 글자들. 이미 있는 것과 겹치면 빼고, 남은 자리(room)만큼만 */
export function toAiTodoTexts(
  raw: unknown,
  existing: string[],
  room: number
): string[] {
  const todos = record(raw).todos;
  if (!Array.isArray(todos)) return [];
  const seen = new Set(existing.map(sameText));
  const texts: string[] = [];
  for (const todo of todos) {
    if (texts.length >= room) break;
    const text =
      typeof todo === 'string' ? todo.trim().slice(0, MAX_TODO_TEXT) : '';
    if (!text || seen.has(sameText(text))) continue;
    seen.add(sameText(text));
    texts.push(text);
  }
  return texts;
}

/** 'AI로 채우기'의 답: 분류, 카카오에서 찾아볼 장소 이름, 지역, 새로 넣을 할 것 */
export type AiFill = {
  /** 종류를 못 골랐으면 null (그대로 둔다) */
  cls: AiClass | null;
  /** 카카오 장소 검색에 넣을 이름. 한 곳을 특정하지 못했으면 빈 글자 */
  placeQuery: string;
  /** 이름에 드러난 지역. 없으면 빈 글자 */
  location: string;
  todos: string[];
};

const shortText = (v: unknown, max: number) =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

export function toAiFill(
  raw: unknown,
  existingTodos: string[],
  room: number
): AiFill {
  const { place, location } = record(raw);
  return {
    cls: toAiClass(raw),
    // 카카오 검색어는 50자까지
    placeQuery: shortText(place, 50),
    location: shortText(location, 40),
    todos: toAiTodoTexts(raw, existingTodos, room),
  };
}

/** 오늘 쓴 횟수와 하루 한도 */
export type AiQuota = { used: number; limit: number };
export type AiUsage = {
  /** 눌러서 쓰는 기능 (AI로 채우기, 여러 개 담기, 추천) */
  ai: AiQuota;
  /** 이름을 쓰면 저절로 되는 카테고리 고르기 */
  auto: AiQuota;
};

function toQuota(raw: unknown): AiQuota {
  const { used, limit } = record(raw);
  const count = (v: unknown) =>
    typeof v === 'number' && Number.isFinite(v)
      ? Math.max(0, Math.floor(v))
      : 0;
  const max = count(limit);
  // 한도를 넘겨 쓴 것으로 와도 남은 횟수가 음수가 되지 않게 한다
  return { used: Math.min(count(used), max), limit: max };
}

export function toAiUsage(raw: unknown): AiUsage {
  const { ai, auto } = record(raw);
  return { ai: toQuota(ai), auto: toQuota(auto) };
}

/** 담을 항목을 addItems에 넣을 모양으로 */
export function draftToInput(draft: AiDraft): BucketInput {
  return { ...draft, location: '', place: null, memo: '' };
}
