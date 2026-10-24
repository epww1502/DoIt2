import { cn } from '@/lib/utils';
import { Platform, View, type ViewProps } from 'react-native';
import * as React from 'react';
import { Text } from './Text';

type CardProps = ViewProps &
  React.RefAttributes<React.ComponentRef<typeof View>>;

function Card({ className, ...props }: CardProps) {
  return (
    <View
      className={cn(
        'rounded-md border bg-card border-border',
        Platform.select({
          web: 'transition-shadow',
        }),
        className
      )}
      {...props}
    />
  );
}

type CardHeaderProps = ViewProps &
  React.RefAttributes<React.ComponentRef<typeof View>>;

function CardHeader({ className, ...props }: CardHeaderProps) {
  return (
    <View
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  );
}

type CardTitleProps = React.ComponentProps<typeof Text>;

function CardTitle({ className, ...props }: CardTitleProps) {
  return (
    <Text
      role="heading"
      variant="title"
      className={cn(
        'leading-none tracking-tight text-card-foreground',
        className
      )}
      {...props}
    />
  );
}

type CardDescriptionProps = React.ComponentProps<typeof Text>;

function CardDescription({ className, ...props }: CardDescriptionProps) {
  return <Text variant="muted" className={cn(className)} {...props} />;
}

type CardContentProps = ViewProps &
  React.RefAttributes<React.ComponentRef<typeof View>>;

function CardContent({ className, ...props }: CardContentProps) {
  return <View className={cn('p-6 pt-0', className)} {...props} />;
}

type CardFooterProps = ViewProps &
  React.RefAttributes<React.ComponentRef<typeof View>>;

function CardFooter({ className, ...props }: CardFooterProps) {
  return (
    <View
      className={cn('flex flex-row items-center p-6 pt-0', className)}
      {...props}
    />
  );
}

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
export type {
  CardProps,
  CardHeaderProps,
  CardTitleProps,
  CardDescriptionProps,
  CardContentProps,
  CardFooterProps,
};
