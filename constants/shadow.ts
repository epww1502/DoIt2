import type { ViewStyle } from 'react-native';

/**
 * 아기자기한 테마의 카드 그림자: 아래로 살짝 떠 보이는 따뜻한 갈색 그림자.
 * 크기에는 영향이 없다 (테두리를 두껍게 하는 대신 그림자로 띄운다).
 */
export const SOFT_SHADOW: ViewStyle = {
  shadowColor: '#8C6D53',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.12,
  shadowRadius: 8,
  elevation: 2,
};
