import { createContext, useContext } from 'react';

/**
 * 떠 있는 탭바가 화면 아래를 덮는 높이(px). 탭 화면은 목록 끝·아래 버튼을
 * 이만큼 띄워서 탭바에 가리지 않게 한다. 탭 밖 화면에서는 0.
 */
export const TabBarSpaceContext = createContext(0);

export function useTabBarSpace() {
  return useContext(TabBarSpaceContext);
}
