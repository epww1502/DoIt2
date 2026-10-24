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
    }),
    {
      name: 'doit2-settings',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        pickAnimation: state.pickAnimation,
        palette: state.palette,
        haptics: state.haptics,
      }),
    }
  )
);

/** 지금 테마색 (#RRGGBB). 클래스(bg-primary 등)를 못 쓰는 곳(탭 아이콘, 스위치, 별 채우기, 지도 핀)에서 쓴다 */
export function usePrimaryColor() {
  return useSettingsStore((s) => paletteHex(s.palette));
}
