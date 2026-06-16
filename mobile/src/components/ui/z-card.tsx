import { View } from 'react-native';
import type { ZCardProps } from './z-card.types';

export type { ZCardProps } from './z-card.types';

/**
 * ZCard — NativeWind fallback (web / Storybook / jest).
 *
 * Section card surface. Mobile counterpart of the recurring web section
 * card (rounded bg-white p-4 shadow-sm). Per the Material handoff
 * (filled-tonal direction) the card is borderless — the warm screen
 * background gives the `surface` fill enough separation. On native platforms
 * the .ios.tsx and .android.tsx variants replace this with OS-native widgets.
 */
export function ZCard({ children, className, testID }: ZCardProps) {
  return (
    <View
      testID={testID}
      className={`rounded-2xl bg-z-surface p-4${className ? ` ${className}` : ''}`}
    >
      {children}
    </View>
  );
}
