import { View } from 'react-native';
import type { ZProgressProps } from './z-progress.types';

export type { ZProgressProps } from './z-progress.types';

/** Bare fallback: 6px track (`bg-z-border`) + accent fill (`bg-z-primary`). */
export function ZProgress({ value, className, testID }: ZProgressProps) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      className={`h-1.5 overflow-hidden rounded-full bg-z-border${className ? ` ${className}` : ''}`}
    >
      <View className="h-full rounded-full bg-z-primary" style={{ width: `${pct}%` }} />
    </View>
  );
}
