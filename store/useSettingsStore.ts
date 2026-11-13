import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { TitleFont } from '@/constants/fonts';
import type { BucketSort } from '@/lib/bucket/search';
import {
  DEFAULT_PALETTE,
  paletteHex,
  type PaletteKey,
} from '@/constants/palettes';

export type DoneView = 'card' | 'compact' | 'calendar';
export type BucketView = 'list' | 'compact' | 'category' | 'map';
/** 뽑기 애니메이션: fan(카드 부채꼴), slot(슬롯머신), none(바로 결과) */
export type PickStyle = 'fan' | 'slot' | 'none';

/** 앱 설정 (이 휴대폰에만 저장) */
type SettingsState = {
  /** '오늘 뭐 하지' 뽑을 때 애니메이션 종류 */
  pickStyle: PickStyle;
  setPickStyle: (value: PickStyle) => void;
  /** 제목·버튼·칩 글씨체 (바꾸면 앱을 다시 불러와야 적용된다) */
  titleFont: TitleFont;
  setTitleFont: (value: TitleFont) => void;
  /** 앱 테마색 (버튼·칩·탭 아이콘 등) */
  palette: PaletteKey;
  setPalette: (value: PaletteKey) => void;
  /** 길게 눌러 고르기·뽑기 결과 등에서 진동 */
  haptics: boolean;
  setHaptics: (value: boolean) => void;
  /** '이미 해본 것도 포함'으로 뽑을 때 이 별점 이상인 것만 넣는다 (1이면 전체). 뽑기 화면에서 고르고, 다음에도 기억한다 */
  redoMinRating: number;
  setRedoMinRating: (value: number) => void;
  /** 내가 만든 계정 코드. 다른 계정으로 바꾸면 안 맞으니 누구 코드인지 같이 둔다 */
  accountCode: { userId: string; code: string } | null;
  setAccountCode: (value: { userId: string; code: string } | null) => void;
  /** 함께한 것 보기: card(사진 크게), compact(간단히), calendar(달력) */
  doneView: DoneView;
  setDoneView: (value: DoneView) => void;
  /** 버킷리스트 보기: list(목록), compact(간단히), category(카테고리별), map(지도) */
  bucketView: BucketView;
  setBucketView: (value: BucketView) => void;
  /** 버킷리스트 맨 위 '평가를 기다려요'를 접어 두었는지 */
  awaitingCollapsed: boolean;
  setAwaitingCollapsed: (value: boolean) => void;
  /** 버킷리스트 정렬 */
  bucketSort: BucketSort;
  setBucketSort: (value: BucketSort) => void;
  /** 금요일 저녁 '이번 주말 뭐 할까?' 알림 */
  weekendReminder: boolean;
  setWeekendReminder: (value: boolean) => void;
  /** 같은 공간 사람이 담거나 기록하면 알림 받기 */
  pushEnabled: boolean;
  setPushEnabled: (value: boolean) => void;
  /** 일지 맨 위 추억을 '오늘은 그만 보기'로 숨긴 날 (YYYY-MM-DD) */
  memoryHiddenOn: string | null;
  setMemoryHiddenOn: (value: string | null) => void;
  /** 목록 위의 '백업하기' 안내를 닫았는지 (설정의 백업 줄은 계속 보인다) */
  backupNudgeDismissed: boolean;
  dismissBackupNudge: () => void;
  /** AI 기능을 쓰면 글이 외부 AI 서비스로 전달된다는 데 동의했는지 */
  aiConsent: boolean;
  setAiConsent: (value: boolean) => void;
  /** 마지막으로 본 개인정보처리방침 공지의 시행일 (YYYY-MM-DD). 본 적 없으면 null */
  policyNoticeSeen: string | null;
  setPolicyNoticeSeen: (value: string) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      pickStyle: 'fan',
      setPickStyle: (pickStyle) => set({ pickStyle }),
      titleFont: 'jua',
      setTitleFont: (titleFont) => set({ titleFont }),
      palette: DEFAULT_PALETTE,
      setPalette: (palette) => set({ palette }),
      haptics: true,
      setHaptics: (haptics) => set({ haptics }),
      redoMinRating: 1,
      setRedoMinRating: (redoMinRating) => set({ redoMinRating }),
      accountCode: null,
      setAccountCode: (accountCode) => set({ accountCode }),
      doneView: 'card',
      setDoneView: (doneView) => set({ doneView }),
      bucketView: 'list',
      setBucketView: (bucketView) => set({ bucketView }),
      awaitingCollapsed: false,
      setAwaitingCollapsed: (awaitingCollapsed) => set({ awaitingCollapsed }),
      bucketSort: 'recent',
      setBucketSort: (bucketSort) => set({ bucketSort }),
      weekendReminder: true,
      setWeekendReminder: (weekendReminder) => set({ weekendReminder }),
      pushEnabled: true,
      setPushEnabled: (pushEnabled) => set({ pushEnabled }),
      memoryHiddenOn: null,
      setMemoryHiddenOn: (memoryHiddenOn) => set({ memoryHiddenOn }),
      backupNudgeDismissed: false,
      dismissBackupNudge: () => set({ backupNudgeDismissed: true }),
      aiConsent: false,
      setAiConsent: (aiConsent) => set({ aiConsent }),
      policyNoticeSeen: null,
      setPolicyNoticeSeen: (policyNoticeSeen) => set({ policyNoticeSeen }),
    }),
    {
      name: 'doit2-settings',
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as Record<string, unknown>;
        // v1: 켜고 끄기만 있었다 (끈 사람은 그대로 바로 결과)
        if (version < 2) {
          state.pickStyle = state.pickAnimation === false ? 'none' : 'fan';
          delete state.pickAnimation;
        }
        return state as unknown as SettingsState;
      },
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        pickStyle: state.pickStyle,
        titleFont: state.titleFont,
        palette: state.palette,
        haptics: state.haptics,
        redoMinRating: state.redoMinRating,
        accountCode: state.accountCode,
        doneView: state.doneView,
        bucketView: state.bucketView,
        awaitingCollapsed: state.awaitingCollapsed,
        bucketSort: state.bucketSort,
        weekendReminder: state.weekendReminder,
        pushEnabled: state.pushEnabled,
        memoryHiddenOn: state.memoryHiddenOn,
        backupNudgeDismissed: state.backupNudgeDismissed,
        aiConsent: state.aiConsent,
        policyNoticeSeen: state.policyNoticeSeen,
      }),
    }
  )
);

/** 지금 테마색 (#RRGGBB). 클래스(bg-primary 등)를 못 쓰는 곳(탭 아이콘, 스위치, 별 채우기, 지도 핀)에서 쓴다 */
export function usePrimaryColor() {
  return useSettingsStore((s) => paletteHex(s.palette));
}
