import { Switch, type SwitchProps } from 'react-native';

import { colors } from '@/constants/colors';
import { useThemeMode } from '@/contexts/ThemeModeContext';
import { usePrimaryColor } from '@/store/useSettingsStore';

/** 꺼져 있을 때도 잘 보이게, 배경(회색 카드) 위에서 대비가 나는 진한 회색 */
const OFF_TRACK = { light: colors.gray[300], dark: colors.gray[600] };

type AppSwitchProps = Omit<
  SwitchProps,
  'trackColor' | 'thumbColor' | 'ios_backgroundColor'
>;

/** 앱 공통 스위치: 켜지면 메인 색, 꺼지면 진한 회색 */
export function AppSwitch(props: AppSwitchProps) {
  const { colorScheme } = useThemeMode();
  const off = OFF_TRACK[colorScheme];
  const primary = usePrimaryColor();
  return (
    <Switch
      trackColor={{ false: off, true: primary }}
      thumbColor={colors.white}
      // iOS는 꺼진 상태 배경을 이 값으로 칠한다
      ios_backgroundColor={off}
      {...props}
    />
  );
}
