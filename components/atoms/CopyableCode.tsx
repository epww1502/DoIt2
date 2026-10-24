import { Copy } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { copyText } from '@/lib/clipboard';
import { cn } from '@/lib/utils';

import { Icon } from './Icon';
import { Text } from './Text';

type CopyableCodeProps = {
  code: string;
  /** 복사한 뒤 보여줄 문구 */
  doneMessage: string;
  /** 글자 크기 (초대 코드 30, 계정 코드 22) */
  size: number;
  className?: string;
};

/** 큰 코드 + 오른쪽 복사 아이콘. 어디를 눌러도 복사된다 */
export function CopyableCode({
  code,
  doneMessage,
  size,
  className,
}: CopyableCodeProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${code} 복사`}
      onPress={() => void copyText(code, doneMessage)}
      className={cn(
        'flex-row items-center justify-center gap-3 rounded-2xl px-6 py-3 bg-background active:opacity-70',
        className
      )}
    >
      <Text
        weight="800"
        size={size}
        className={size >= 28 ? 'tracking-[6px]' : 'tracking-[3px]'}
      >
        {code}
      </Text>
      <Icon as={Copy} size={18} className="text-muted-foreground" />
    </Pressable>
  );
}
