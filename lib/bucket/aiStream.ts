/**
 * AI 답이 글자 단위로 도착하는 동안, 지금까지 온 글에서 다 쓰인 항목만 꺼낸다.
 * 답은 { "items": [ {...}, {...} ] } 모양의 JSON이고, 아직 닫히지 않은 마지막 항목은 건너뛴다.
 */

/** 서버가 한 줄씩 보내는 것: 단계, 답의 글자 조각, 끝, 오류 */
export type AiStreamLine =
  | { stage: 'thinking' | 'writing' }
  | { text: string }
  | { done: true }
  | { error: string; reason?: string };

/**
 * 지금까지 온 글(partial)에서 완성된 항목들. 글자 안의 중괄호·따옴표·역슬래시는 구조로 세지 않는다.
 * items 배열이 아직 시작되지 않았으면 빈 목록.
 */
export function completeItems(partial: string): unknown[] {
  const key = partial.indexOf('"items"');
  if (key < 0) return [];
  const open = partial.indexOf('[', key);
  if (open < 0) return [];

  const items: unknown[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let i = open + 1; i < partial.length; i++) {
    const ch = partial[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        try {
          items.push(JSON.parse(partial.slice(start, i + 1)));
        } catch {
          // 온전하지 않은 조각은 건너뛴다 (끝에서 전체를 다시 읽는다)
        }
        start = -1;
      }
    } else if (ch === ']' && depth === 0) {
      break;
    }
  }
  return items;
}

/** 한 줄씩 끊어 읽기: 지금까지 받은 글(buffer)에서 다 온 줄들과 남은 조각 */
export function splitLines(buffer: string): { lines: string[]; rest: string } {
  const parts = buffer.split('\n');
  const rest = parts.pop() ?? '';
  return { lines: parts.filter((line) => line.trim() !== ''), rest };
}

/** 서버가 보낸 한 줄. 모르는 모양이면 null */
export function parseStreamLine(line: string): AiStreamLine | null {
  try {
    const value = JSON.parse(line) as Record<string, unknown>;
    if (value.stage === 'thinking' || value.stage === 'writing') {
      return { stage: value.stage };
    }
    if (typeof value.text === 'string') return { text: value.text };
    if (value.done === true) return { done: true };
    if (typeof value.error === 'string') {
      return {
        error: value.error,
        reason: typeof value.reason === 'string' ? value.reason : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}
