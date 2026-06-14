/**
 * ZBadge — shared NativeWind implementation (web / iOS / Android / jest).
 *
 * This is the ONLY implementation file for ZBadge — there are no .ios.tsx or
 * .android.tsx variants. See z-badge.types.ts for the rationale (no native
 * widget maps to a semantic status pill on either platform).
 *
 * Colors come exclusively from role tokens defined in tailwind.config.js
 * (success-container / on-success-container / warning-container / etc.),
 * which map to CSS vars generated from theme/roles.ts. No raw hex values.
 *
 * Tier: Custom RN (shared) — small presentational capsule with no native
 * interactive equivalent.
 */

import { Text, View } from 'react-native';
import type { ZBadgeProps, ZBadgeTone } from './z-badge.types';

export type { ZBadgeTone, ZBadgeProps } from './z-badge.types';

const containerClasses: Record<ZBadgeTone, string> = {
  neutral: 'border-outline bg-surface-variant',
  primary: 'border-accent-container bg-accent-container',
  success: 'border-success-container bg-success-container',
  warning: 'border-warning-container bg-warning-container',
  danger: 'border-danger-container bg-danger-container',
};

const labelClasses: Record<ZBadgeTone, string> = {
  neutral: 'text-on-surface-variant',
  primary: 'text-on-accent-container',
  success: 'text-on-success-container',
  warning: 'text-on-warning-container',
  danger: 'text-on-danger-container',
};

/**
 * Status pill / count badge. Mobile counterpart of the web `z-badge`
 * wrapper (web/dashboard-next/src/app/shared/ui/badge/).
 * Pass `label` as the display text; use `tone` for semantic coloring.
 */
export function ZBadge({ label, tone = 'neutral', testID }: ZBadgeProps) {
  return (
    <View
      testID={testID}
      className={`self-start rounded-md border px-2 py-1 ${containerClasses[tone]}`}
    >
      <Text className={`text-xs font-semibold ${labelClasses[tone]}`}>{label}</Text>
    </View>
  );
}
