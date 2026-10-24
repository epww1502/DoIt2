import { Text } from '@/components/atoms';

export function FieldLabel({ children }: { children: string }) {
  return (
    <Text weight="600" size={14} className="mb-2 text-muted-foreground">
      {children}
    </Text>
  );
}
