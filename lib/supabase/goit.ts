/** 고잇투에서 공유한 여행 일정 불러오기 (같은 Supabase의 goit-plan 함수) */
import { toTrip, type GoitTrip } from '@/lib/goit';

import { supabase } from './client';

export class GoitNotFoundError extends Error {
  constructor() {
    super('만료됐거나 없는 링크예요.');
    this.name = 'GoitNotFoundError';
  }
}

/** id로 일정을 받는다. 없거나 30일이 지났으면 GoitNotFoundError */
export async function loadGoitTrip(
  id: string
): Promise<{ trip: GoitTrip; expiresAt: string | null }> {
  const { data, error } = await supabase.functions.invoke<{
    trip?: unknown;
    expiresAt?: unknown;
  }>('goit-plan', { body: { action: 'load', id } });
  if (error) {
    const status = (error as { context?: Response } | null)?.context?.status;
    if (status === 404 || status === 400) throw new GoitNotFoundError();
    throw error;
  }
  const trip = toTrip(data?.trip);
  if (!trip) throw new GoitNotFoundError();
  return {
    trip,
    expiresAt: typeof data?.expiresAt === 'string' ? data.expiresAt : null,
  };
}
