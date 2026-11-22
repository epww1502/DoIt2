import {
  cancelNewRecord,
  noteNewRecord,
  shouldAskReview,
  takeNewRecord,
} from '@/lib/storeReview';

describe('스토어 별점 요청', () => {
  it('기록이 늘어서 세 번째가 되면 묻는다', () => {
    expect(shouldAskReview({ before: 2, now: 3, asked: false })).toBe(true);
    expect(shouldAskReview({ before: 5, now: 6, asked: false })).toBe(true);
  });

  it('아직 세 번이 안 됐으면 묻지 않는다', () => {
    expect(shouldAskReview({ before: 1, now: 2, asked: false })).toBe(false);
  });

  it('기록이 늘지 않았으면 묻지 않는다 (앱을 켜자마자 묻지 않게)', () => {
    expect(shouldAskReview({ before: 7, now: 7, asked: false })).toBe(false);
    expect(shouldAskReview({ before: 7, now: 6, asked: false })).toBe(false);
  });

  it('한 번 물어봤으면 다시 묻지 않는다', () => {
    expect(shouldAskReview({ before: 2, now: 3, asked: true })).toBe(false);
  });
});

describe('방금 남긴 새 기록 알리기', () => {
  it('알린 뒤 한 번만 꺼낼 수 있다', () => {
    noteNewRecord();
    expect(takeNewRecord()).toBe(true);
    expect(takeNewRecord()).toBe(false);
  });

  it('알리지 않았으면 없다 (앱을 켜서 목록만 불러온 경우)', () => {
    expect(takeNewRecord()).toBe(false);
  });

  it('저장에 실패해 되돌리면 없다', () => {
    noteNewRecord();
    cancelNewRecord();
    expect(takeNewRecord()).toBe(false);
  });
});
