import { View } from 'react-native';
import type { ZProgressProps } from './z-progress.types';

export type { ZProgressProps } from './z-progress.types';

/**
 * Bare fallback: 6px neutral-gray track + accent fill (`bg-z-primary`).
 *
 * The track is intentional system-neutral chrome (Tailwind `neutral`, not the
 * warm `outline`/`z-border` taupe) so the bar reads as an accent fill on a
 * plain gray rail — light gray in light mode, dark gray in dark mode.
 */
export function ZProgress({ value, className, testID }: ZProgressProps) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      className={`h-1.5 overflow-hidden rounded-full bg-neutral-300 dark:bg-neutral-700${className ? ` ${className}` : ''}`}
    >
      <View className="h-full rounded-full bg-z-primary" style={{ width: `${pct}%` }} />
    </View>
  );
}
