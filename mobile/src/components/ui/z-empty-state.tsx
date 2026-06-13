import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Inbox } from 'lucide-react-native';
import { colors } from '../../theme/colors';

/**
 * Empty placeholder for lists and sections. Mobile counterpart of the web
 * `z-empty-state` wrapper (web/dashboard-next/src/app/shared/ui/empty-state/).
 * Optional children render as an action slot below the description.
 */
export function ZEmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <View className="items-center rounded-lg border border-dashed border-z-border bg-z-surface px-5 py-8">
      <View className="h-12 w-12 items-center justify-center rounded-lg bg-z-surface-warm">
        <Inbox color={colors.primary} size={24} />
      </View>
      <Text className="mt-4 text-base font-semibold text-z-text text-center">{title}</Text>
      <Text className="mt-2 text-sm leading-6 text-z-muted text-center">{description}</Text>
      {children ? <View className="mt-5">{children}</View> : null}
    </View>
  );
}
