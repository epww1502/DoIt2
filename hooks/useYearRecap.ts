import { useMemo } from 'react';

import { useReviewCtx } from '@/hooks/useReviewCtx';
import { itemStatus, viewForMe } from '@/lib/bucket/reviews';
import { buildYearRecap, recapYear } from '@/lib/bucket/yearRecap';
import { useBucketStore } from '@/store/useBucketStore';

/** '올해의 우리'에 쓸 한 해 돌아보기 (내 기준으로 본 기록). 볼 기록이 없으면 recap이 null */
export function useYearRecap() {
  const items = useBucketStore((s) => s.items);
  const reviewCtx = useReviewCtx();

  const done = useMemo(
    () =>
      items
        .filter((it) => itemStatus(it, reviewCtx) === 'done')
        .map((it) => viewForMe(it, reviewCtx)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, reviewCtx.userId, reviewCtx.inSpace]
  );
  const year = recapYear(done, new Date());
  const recap = useMemo(
    () => (year ? buildYearRecap(done, year) : null),
    [done, year]
  );
  return { year, recap };
}
