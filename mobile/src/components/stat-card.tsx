import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ZIconTile, type ZIconTileTone } from './ui/z-icon-tile';

/**
 * KPI/stat tile per the handoff Reports mock (screens3 StatTile): a column of
 * boxed IconTile → count (26/800) → label (12/700 muted, single line) →
 * optional footer badge. (Replaces the earlier web-home-card anatomy that put
 * the label first with an unboxed trailing icon.)
 *
 * `interactive` (default `true`) keeps the tile tappable for dashboard use;
 * pass `interactive={false}` for read-only KPI tiles (reports) to avoid
 * phantom buttons.
 */
export function StatCard({
  label,
  count,
  icon,
  tone = 'neutral',
  onPress,
  interactive = true,
  footer,
  testID,
}: {
  label: string;
  count: number;
  icon: ReactNode;
  /** ZIconTile tone for the boxed leading icon. */
  tone?: ZIconTileTone;
  onPress?: () => void;
  interactive?: boolean;
  footer?: ReactNode;
  testID?: string;
}) {
  const inner = (
    <>
      <ZIconTile tone={tone} size="sm" icon={icon} />
      <Text className="mt-2 text-[26px] font-extrabold leading-7 text-z-text">{count}</Text>
      <Text numberOfLines={1} className="mt-1 text-xs font-bold text-z-muted">
        {label}
      </Text>
      {footer ? <View className="mt-1.5">{footer}</View> : null}
    </>
  );

  if (!interactive) {
    return (
      <View testID={testID} className="flex-1 rounded-[16px] bg-z-surface p-3.5">
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
      className="flex-1 rounded-[16px] bg-z-surface p-3.5 active:bg-z-surface-warm"
    >
      {inner}
    </Pressable>
  );
}
