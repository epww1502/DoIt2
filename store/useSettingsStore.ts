import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  DEFAULT_PALETTE,
  paletteHex,
  type PaletteKey,
} from '@/constants/palettes';

/** 앱 설정 (이 휴대폰에만 저장) */
type SettingsState = {
  /** '오늘 뭐 하지' 뽑을 때 카드가 촤르륵 지나가는 애니메이션. 끄면 바로 결과 */
  pickAnimation: boolean;
  setPickAnimation: (value: boolean) => void;
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
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      pickAnimation: true,
      setPickAnimation: (pickAnimation) => set({ pickAnimation }),
      palette: DEFAULT_PALETTE,
      setPalette: (palette) => set({ palette }),
      haptics: true,
      setHaptics: (haptics) => set({ haptics }),
      redoMinRating: 1,
      setRedoMinRating: (redoMinRating) => set({ redoMinRating }),
      accountCode: null,
      setAccountCode: (accountCode) => set({ accountCode }),
    }),
    {
      name: 'doit2-settings',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        pickAnimation: state.pickAnimation,
        palette: state.palette,
        haptics: state.haptics,
        redoMinRating: state.redoMinRating,
        accountCode: state.accountCode,
      }),
    }
  )
);

/** 지금 테마색 (#RRGGBB). 클래스(bg-primary 등)를 못 쓰는 곳(탭 아이콘, 스위치, 별 채우기, 지도 핀)에서 쓴다 */
export function usePrimaryColor() {
  return useSettingsStore((s) => paletteHex(s.palette));
}
