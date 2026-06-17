/**
 * ZDivider — bare NativeWind fallback (web / Storybook / jest).
 *
 * A thin separator rule drawn with the `outline` role token. This fallback is
 * the test/contract surface; the platform files (.ios.tsx / .android.tsx) carry
 * the per-platform stroke widths (0.5pt hairline on iOS, 1dp on Android).
 *
 * Tier: Custom RN. See z-divider.types.ts.
 */

import { View } from 'react-native';
import type { ZDividerProps } from './z-divider.types';

export type { ZDividerProps } from './z-divider.types';

export function ZDivider({
  vertical = false,
  inset = false,
  className,
  style,
  testID,
}: ZDividerProps) {
  // Horizontal: 1px tall, full width. Vertical: 1px wide, full height.
  const lineClass = vertical ? 'w-px h-full' : 'h-px w-full';
  // Table-separator inset: 16dp along the cross axis.
  const insetClass = inset ? (vertical ? 'my-4' : 'mx-4') : '';

  return (
    <View
      testID={testID}
      style={style}
      className={`bg-outline ${lineClass} ${insetClass} ${className ?? ''}`.trim()}
    />
  );
}
