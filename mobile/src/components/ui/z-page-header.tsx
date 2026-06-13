import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

/**
 * Compact screen header: title + optional one-line subtitle + optional trailing
 * action slot. Mobile-only primitive (no web counterpart — the web hand-rolls a
 * bordered header-card with title/description/actions on each page). On mobile
 * that card is reserved for detail heroes and form summaries; list/index screens
 * use this compact header plus a FAB for the primary create action. No card
 * border by design — it sits directly on the screen background.
 */
export function ZPageHeader({
  title,
  subtitle,
  action,
  testID,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  testID?: string;
}) {
  return (
    <View testID={testID} className="flex-row items-start justify-between gap-3 px-4 py-3">
      <View className="flex-1">
        <Text className="text-2xl font-semibold text-z-text">{title}</Text>
        {subtitle ? (
          <Text className="mt-1 text-sm leading-6 text-z-muted">{subtitle}</Text>
        ) : null}
      </View>
      {action ? <View className="shrink-0">{action}</View> : null}
    </View>
  );
}
