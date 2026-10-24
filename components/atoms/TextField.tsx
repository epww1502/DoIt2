import { Search, X } from 'lucide-react-native';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';

import { FONT_WEIGHTS } from '@/constants/fonts';
import { colors } from '@/constants/colors';
import { cn } from '@/lib/utils';

import { Icon } from './Icon';

type TextFieldProps = TextInputProps & {
  /** search: 회색 배경 + 돋보기, outline: 회색 배경(테두리 없음) + 지우기 버튼 */
  variant?: 'search' | 'outline';
  className?: string;
};

export function TextField({
  variant = 'outline',
  value,
  onChangeText,
  className,
  ...props
}: TextFieldProps) {
  const isSearch = variant === 'search';
  // 글자가 있으면 오른쪽에 X (검색칸은 돋보기 대신 X)
  const showClear = !!value;

  return (
    <View
      className={cn(
        'flex-row items-center rounded-xl px-4',
        isSearch ? 'h-11 bg-accent' : 'h-12 bg-accent',
        className
      )}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.gray[400]}
        className="flex-1 text-foreground"
        style={{
          fontFamily: FONT_WEIGHTS[isSearch ? '400' : '500'],
          fontSize: isSearch ? 14 : 16,
          paddingVertical: 0,
        }}
        {...props}
      />
      {isSearch && !showClear ? (
        <Icon as={Search} size={18} className="text-muted-foreground" />
      ) : null}
      {showClear ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="지우기"
          hitSlop={8}
          onPress={() => onChangeText?.('')}
          className="ml-2 h-5 w-5 items-center justify-center rounded-full bg-muted-foreground/40"
        >
          <Icon as={X} size={13} className="text-white" />
        </Pressable>
      ) : null}
    </View>
  );
}
