import { cva, type VariantProps } from 'class-variance-authority';
import { Pressable, type PressableProps } from 'react-native';

import { cn } from '@/lib/utils';

import { Text } from './Text';

const buttonVariants = cva('items-center justify-center rounded-xl', {
  variants: {
    variant: {
      // 메인 색 배경
      primary: 'bg-primary',
      // 테두리만
      outline: 'border bg-background border-border',
      // 텍스트만 ("나중에 할게요")
      ghost: 'bg-transparent',
    },
    size: {
      lg: 'h-14 px-5',
      md: 'h-11 px-4',
    },
  },
  defaultVariants: { variant: 'primary', size: 'lg' },
});

const labelVariants = cva('', {
  variants: {
    variant: {
      primary: 'text-primary-foreground',
      outline: 'text-foreground',
      ghost: 'text-muted-foreground',
    },
  },
  defaultVariants: { variant: 'primary' },
});

type ButtonProps = Omit<PressableProps, 'children'> &
  VariantProps<typeof buttonVariants> & {
    label: string;
    className?: string;
  };

export function Button({
  label,
  variant,
  size,
  disabled,
  className,
  ...props
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      className={cn(
        buttonVariants({ variant, size }),
        disabled && 'opacity-40',
        className
      )}
      {...props}
    >
      <Text weight="600" size={16} className={labelVariants({ variant })}>
        {label}
      </Text>
    </Pressable>
  );
}
