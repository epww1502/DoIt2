import { View } from 'react-native';

import { AppSwitch, Text } from '@/components/atoms';
import type { RepeatInfo } from '@/lib/bucket/types';

type RepeatFieldProps = {
  value: RepeatInfo | null;
  onChange: (value: RepeatInfo | null) => void;
};

/** 매년 하기 (벚꽃 구경, 크리스마스 마켓처럼 해마다 하는 것) */
export function RepeatField({ value, onChange }: RepeatFieldProps) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="flex-1 gap-0.5">
        <Text weight="600" size={15}>
          매년 하기
        </Text>
        <Text variant="muted" size={12}>
          해내면 일지에 남고, 내년 이맘때 한 달 전에 목록에 다시 올라와요
        </Text>
      </View>
      <AppSwitch
        accessibilityLabel="매년 하기"
        value={value !== null}
        // 끄면 쉬는 중이던 것도 바로 목록에 보인다
        onValueChange={(on) =>
          onChange(on ? (value ?? { every: 'year' }) : null)
        }
      />
    </View>
  );
}
