import { TextClassContext } from '@/components/atoms/Text';
import { cn } from '@/lib/utils';
import * as Slot from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Platform, View, ViewProps } from 'react-native';

const badgeVariants = cva(
  cn(
    'group shrink-0 flex-row items-center justify-center gap-1 overflow-hidden rounded-full border px-2 py-0.5 border-border',
    Platform.select({
      web: 'aria-invalid:ring-destructive/20 aria-invalid:border-destructive [&>svg]:size-3 w-fit whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>svg]:pointer-events-none',
    })
  ),
  {
    variants: {
      variant: {
        default: cn(
          'border-transparent bg-primary',
          Platform.select({ web: '[a&]:hover:bg-primary/90' })
        ),
        secondary: cn(
          'border-transparent bg-secondary',
          Platform.select({ web: '[a&]:hover:bg-secondary/90' })
        ),
        primary: cn(
          'border-transparent bg-accent',
          Platform.select({ web: '[a&]:hover:bg-primary/90' })
        ),
        destructive: cn(
          'border-transparent bg-destructive/10',
          Platform.select({ web: '[a&]:hover:bg-destructive/90' })
        ),
        outline: Platform.select({
          web: '[a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
        }),
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const badgeTextVariants = cva('text-xs font-medium', {
  variants: {
    variant: {
      default: 'text-white',
      secondary: 'text-secondary-foreground',
      primary: 'text-primary',
      destructive: 'text-destructive',
      outline: 'text-foreground',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

type BadgeProps = ViewProps &
  React.RefAttributes<React.ComponentRef<typeof View>> & {
    asChild?: boolean;
  } & VariantProps<typeof badgeVariants>;

function Badge({ className, variant, asChild, ...props }: BadgeProps) {
  const Component = asChild ? Slot.View : View;
  return (
    <TextClassContext.Provider value={badgeTextVariants({ variant })}>
      <Component
        className={cn(badgeVariants({ variant }), className)}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export { Badge, badgeTextVariants, badgeVariants };
export type { BadgeProps };
