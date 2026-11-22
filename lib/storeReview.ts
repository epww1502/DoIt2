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

/**
 * 방금 이 폰에서 새 기록을 남겼는지. 기록 수가 늘어난 것만 보면 앱을 켤 때 저장된 목록을 불러오거나
 * 서버에서 받거나 공간을 바꿀 때도 "늘었다"로 보여서, 기록 화면이 저장하는 순간을 직접 알려 준다.
 */
let newRecordPending = false;

/** 기록 화면: 새 기록을 저장하기 직전에 부른다 */
export function noteNewRecord() {
  newRecordPending = true;
}

/** 기록 화면: 저장에 실패했으면 되돌린다 */
export function cancelNewRecord() {
  newRecordPending = false;
}

/** 첫 화면: 새 기록이 있었으면 true를 주고 비운다 (한 번만) */
export function takeNewRecord() {
  const pending = newRecordPending;
  newRecordPending = false;
  return pending;
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
