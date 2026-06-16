import { Text, View } from 'react-native';
import { Inbox } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import type { ZEmptyStateProps } from './z-empty-state.types';

export type { ZEmptyStateProps } from './z-empty-state.types';

/**
 * ZEmptyState — NativeWind fallback (web / Storybook / jest).
 *
 * Empty placeholder for lists and sections. Mobile counterpart of the web
 * `z-empty-state` wrapper (web/dashboard-next/src/app/shared/ui/empty-state/).
 * Optional children render as an action slot below the description.
 * Pass `icon` to override the default Inbox glyph (e.g. an alert for errors).
 * On native platforms the .ios.tsx and .android.tsx variants replace this.
 */
export function ZEmptyState({
  title,
  description,
  icon = <Inbox color={colors.primary} size={24} />,
  children,
}: ZEmptyStateProps) {
  return (
    <View className="items-center rounded-2xl bg-z-surface px-5 py-8">
      <View className="h-12 w-12 items-center justify-center rounded-lg bg-z-surface-warm">
        {icon}
      </View>
      <Text className="mt-4 text-base font-semibold text-z-text text-center">{title}</Text>
      <Text className="mt-2 text-sm leading-6 text-z-muted text-center">{description}</Text>
      {children ? <View className="mt-5">{children}</View> : null}
    </View>
  );
}
