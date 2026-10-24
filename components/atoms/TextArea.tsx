import { TextInput, type TextInputProps } from 'react-native';

import { colors } from '@/constants/colors';
import { FONT_WEIGHTS } from '@/constants/fonts';
import { cn } from '@/lib/utils';

type TextAreaProps = TextInputProps & { className?: string };

/** 여러 줄 입력 (메모, 후기) */
export function TextArea({ className, style, ...props }: TextAreaProps) {
  return (
    <TextInput
      multiline
      textAlignVertical="top"
      placeholderTextColor={colors.gray[400]}
      className={cn(
        'min-h-[96px] rounded-xl border-[1.5px] px-4 py-3 bg-background text-foreground border-border',
        className
      )}
      style={[{ fontFamily: FONT_WEIGHTS['400'], fontSize: 16 }, style]}
      {...props}
    />
  );
}
