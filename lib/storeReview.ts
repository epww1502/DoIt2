/**
 * 스토어 별점 요청 (새 빌드부터). 기록을 몇 번 남긴 사람에게 스토어 안의 별점 창을 한 번 띄운다.
 * 창을 실제로 보여줄지는 폰(스토어)이 정한다 (너무 자주 부르면 보여주지 않는다).
 */
import { requireOptionalNativeModule } from 'expo';

/** 기록을 이만큼 남긴 뒤에 묻는다 */
export const REVIEW_AFTER_RECORDS = 3;

/**
 * 지금 별점을 물어볼지: 방금 기록이 늘어서 기준을 넘었고, 물어본 적이 없을 때.
 * 전부터 기록이 많던 사람에게 앱을 켜자마자 묻지 않게, 기록이 늘어난 순간에만 묻는다.
 */
export function shouldAskReview(state: {
  /** 기록 수: 방금 전 → 지금 */
  before: number;
  now: number;
  asked: boolean;
}) {
  return (
    !state.asked &&
    state.now > state.before &&
    state.now >= REVIEW_AFTER_RECORDS
  );
}

/** 스토어 별점 창을 띄운다. 띄우려고 했으면 true (모듈이 없는 빌드나 못 띄우는 폰이면 false) */
export async function askStoreReview() {
  if (!requireOptionalNativeModule('ExpoStoreReview')) return false;
  try {
    const StoreReview = await import('expo-store-review');
    if (!(await StoreReview.hasAction())) return false;
    await StoreReview.requestReview();
    return true;
  } catch {
    return false;
  }
}
