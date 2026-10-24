import {
  FONT_WEIGHTS,
  FontWeight,
  TextVariant,
  VARIANT_FONT,
} from '@/constants/fonts';
import { cn } from '@/lib/utils';
import * as Slot from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { useContext, useMemo } from 'react';
import { Platform, Text as RNText, type Role } from 'react-native';

const textVariants = cva(
  cn(
    'text-foreground',
    Platform.select({
      web: 'select-text',
    })
  ),
  {
    variants: {
      variant: {
        // 기본
        default: 'text-sm', // 14px / 20px, 400

        // 제목
        display: 'text-2xl text-foreground', // 24px / 32px, 700
        title: 'text-lg text-blackWhite', // 18px / 28px, 700
        heading: 'text-xl text-foreground', // 20px / 28px, 600
        subheading: 'text-lg text-foreground', // 18px / 28px, 600

        // 본문
        body: 'text-base text-foreground', // 16px / 24px, 400

        // 작은 텍스트
        caption: 'text-sm text-muted-foreground', // 14px / 20px, 500
        label: 'text-sm text-primary', // 14px / 20px, 500
        small: 'text-xs text-foreground', // 12px / 16px, 400
        tiny: 'text-[10px] leading-[14px]', // 10px / 14px, 400

        // 보조 텍스트
        muted: 'text-sm text-muted-foreground', // 14px / 20px, 400
        link: 'text-sm underline text-primary', // 14px / 20px, 400
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export type TextVariantProps = VariantProps<typeof textVariants>;

const ROLE: Partial<Record<TextVariant, Role>> = {
  title: 'heading',
  heading: 'heading',
  subheading: 'heading',
  link: 'link',
};

const ARIA_LEVEL: Partial<Record<TextVariant, string>> = {
  title: '1',
  heading: '2',
  subheading: '3',
  link: '4',
};

const TextClassContext = React.createContext<string | undefined>(undefined);

type TextProps = React.ComponentProps<typeof RNText> &
  TextVariantProps &
  React.RefAttributes<RNText> & {
    asChild?: boolean;
    /**
     * 폰트 두께 (100~900)
     * - `'100'`: Pretendard-Thin
     * - `'200'`: Pretendard-ExtraLight
     * - `'300'`: Pretendard-Light
     * - `'400'`: Pretendard-Regular
     * - `'500'`: Pretendard-Medium
     * - `'600'`: Pretendard-SemiBold
     * - `'700'`: Pretendard-Bold
     * - `'800'`: Pretendard-ExtraBold
     * - `'900'`: Pretendard-Black
     */
    weight?: FontWeight;
    size?: number; // 폰트 크기 (px)
    /**
     * - `'default'`: Pretendard-Regular (400) - 16px - text-foreground - 기본 텍스트
     * - `'display'`: Pretendard-Bold (700) - 24px - text-foreground - 가장 큰 텍스트
     * - `'title'`: Pretendard-Bold (700) - 18px - text-blackWhite - 헤더 타이틀
     * - `'heading'`: Pretendard-SemiBold (600) - 20px - text-foreground - 섹션 제목
     * - `'subheading'`: Pretendard-SemiBold (600) - 18px - text-foreground - 서브 제목
     * - `'body'`: Pretendard-Regular (400) - 16px - text-foreground - 일반 본문
     * - `'caption'`: Pretendard-Medium (500) - 14px - text-muted-foreground - 캡션, 타임스탬프
     * - `'label'`: Pretendard-Medium (500) - 14px - text-primary - 라벨, 버튼 텍스트
     * - `'small'`: Pretendard-Regular (400) - 12px - text-foreground - 작은 텍스트
     * - `'tiny'`: Pretendard-Regular (400) - 10px - text-foreground - 극소 텍스트
     * - `'muted'`: Pretendard-Regular (400) - 14px - text-muted-foreground - 흐린 텍스트
     * - `'link'`: Pretendard-Regular (400) - 14px - text-primary - 링크 텍스트
     */
    variant?: TextVariantProps['variant'];
  };

/** size를 줄 때 쓰는 줄 높이 비율 */
const LINE_HEIGHT_RATIO = 1.4;

function Text({
  className,
  asChild = false,
  variant = 'default',
  weight,
  size,
  style,
  ...props
}: TextProps) {
  const textClass = useContext(TextClassContext);
  const Component = asChild ? Slot.Text : RNText;

  const fontFamily = useMemo(() => {
    if (weight) return FONT_WEIGHTS[weight];
    return VARIANT_FONT[variant || 'default'];
  }, [variant, weight]);

  return (
    <Component
      className={cn(textVariants({ variant }), textClass, className)}
      role={variant ? ROLE[variant] : undefined}
      aria-level={variant ? ARIA_LEVEL[variant] : undefined}
      // size만 바꾸면 variant의 줄 높이(text-sm은 20px)가 남아 큰 글씨·이모지가 잘린다
      style={[
        { fontFamily },
        size !== undefined && {
          fontSize: size,
          lineHeight: Math.round(size * LINE_HEIGHT_RATIO),
        },
        style,
      ]}
      {...props}
    />
  );
}

export { Text, TextClassContext };
