import type { BucketItem } from './types';

/** 기록에 적을 수 있는 가장 큰 돈 (1억 원) */
export const MAX_COST = 100_000_000;

/** 32000 → '32,000원' */
export function formatWon(won: number) {
  return `${Math.round(won).toLocaleString('ko-KR')}원`;
}

/** 큰 돈은 짧게: 320000 → '32만 원', 12345678 → '1,234만 원', 9800 → '9,800원' */
export function shortWon(won: number) {
  if (won < 10_000) return formatWon(won);
  const man = Math.round(won / 10_000);
  return `${man.toLocaleString('ko-KR')}만 원`;
}

/** 입력칸 글자 → 원 (숫자만 골라서, 비었거나 0이면 null) */
export function parseWon(text: string): number | null {
  const digits = text.replace(/[^0-9]/g, '');
  if (!digits) return null;
  const won = Math.min(Number(digits), MAX_COST);
  return won > 0 ? won : null;
}

/** 입력칸에 보여줄 글자: 32000 → '32,000' */
export function wonInputText(won: number | null | undefined) {
  return won ? won.toLocaleString('ko-KR') : '';
}

export type Spending = {
  /** 쓴 돈을 적은 기록들의 합 */
  total: number;
  /** 쓴 돈을 적은 기록 수 */
  count: number;
  /** 가장 많이 쓴 기록 */
  priciest: BucketItem | null;
};

/** 기록들의 쓴 돈 (적지 않은 기록은 뺀다) */
export function spendingOf(items: BucketItem[]): Spending {
  let total = 0;
  let count = 0;
  let priciest: BucketItem | null = null;
  for (const item of items) {
    const cost = item.done?.cost ?? 0;
    if (cost <= 0) continue;
    total += cost;
    count += 1;
    if (!priciest || cost > (priciest.done?.cost ?? 0)) priciest = item;
  }
  return { total, count, priciest };
}
