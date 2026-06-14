import { View } from 'react-native';
import type { ZCardProps } from './z-card.types';

export type { ZCardProps } from './z-card.types';

/**
 * ZCard — NativeWind fallback (web / Storybook / jest).
 *
 * Section card surface. Mobile counterpart of the recurring web section
 * card (rounded-lg border bg-white p-4 shadow-sm); the border is the
 * delimiter on mobile instead of a shadow. On native platforms the
 * .ios.tsx and .android.tsx variants replace this with OS-native widgets.
 */
export function ZCard({ children, className, testID }: ZCardProps) {
  return (
    <View
      testID={testID}
      className={`rounded-lg border border-z-border bg-z-surface p-4${className ? ` ${className}` : ''}`}
    >
      {children}
    </View>
  );
}
