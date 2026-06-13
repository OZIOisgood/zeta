import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

/**
 * Dashboard overview tile. Mobile counterpart of the web home page stat cards
 * (pages/home/home-page.component.ts): a tappable surface showing a single live
 * count with a label and a leading accent icon, navigating to its section.
 */
export function StatCard({
  label,
  count,
  icon,
  onPress,
  testID,
}: {
  label: string;
  count: number;
  icon: ReactNode;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${count}`}
      onPress={onPress}
      className="flex-1 rounded-lg border border-z-border bg-z-surface p-4 active:bg-z-surface-warm"
    >
      <View className="flex-row items-center justify-between gap-2">
        <Text numberOfLines={1} className="flex-1 text-sm font-medium text-z-muted">
          {label}
        </Text>
        {icon}
      </View>
      <Text className="mt-4 text-3xl font-semibold text-z-text">{count}</Text>
    </Pressable>
  );
}
