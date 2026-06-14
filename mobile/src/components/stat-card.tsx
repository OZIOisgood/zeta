import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

/**
 * Dashboard overview tile. Mobile counterpart of the web home page stat cards
 * (pages/home/home-page.component.ts): a tappable surface showing a single live
 * count with a label and a leading accent icon, navigating to its section.
 *
 * `interactive` (default `true`) controls whether the tile is a Pressable or a
 * plain View. Pass `interactive={false}` for read-only KPI tiles (e.g. the
 * reports screen) to avoid phantom buttons. `footer` is an optional trailing
 * slot rendered under the count (e.g. a duration / "in N groups" ZBadge).
 * Both props are backward-compatible additive — existing callers that omit them
 * get the original tappable behavior unchanged.
 */
export function StatCard({
  label,
  count,
  icon,
  onPress,
  interactive = true,
  footer,
  testID,
}: {
  label: string;
  count: number;
  icon: ReactNode;
  onPress?: () => void;
  interactive?: boolean;
  footer?: ReactNode;
  testID?: string;
}) {
  const inner = (
    <>
      <View className="flex-row items-center justify-between gap-2">
        <Text numberOfLines={1} className="flex-1 text-sm font-medium text-z-muted">
          {label}
        </Text>
        {icon}
      </View>
      <Text className="mt-4 text-3xl font-semibold text-z-text">{count}</Text>
      {footer ? <View className="mt-2">{footer}</View> : null}
    </>
  );

  if (!interactive) {
    return (
      <View testID={testID} className="flex-1 rounded-lg border border-z-border bg-z-surface p-4">
        {inner}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${count}`}
      onPress={onPress}
      className="flex-1 rounded-lg border border-z-border bg-z-surface p-4 active:bg-z-surface-warm"
    >
      {inner}
    </Pressable>
  );
}
