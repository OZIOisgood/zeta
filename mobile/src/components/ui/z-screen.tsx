import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ZScreenEdge = 'top' | 'bottom';

/**
 * Shared screen wrapper that keeps content out of the status bar, display
 * cutout, and gesture/navigation areas (Android renders edge-to-edge).
 * Every screen renders inside a ZScreen. Tab screens pass `edges={['top']}`
 * because the tab bar already absorbs the bottom inset; screens with an
 * intentionally edge-to-edge top (e.g. a video player) pass `edges={['bottom']}`.
 * Horizontal insets are always applied.
 */
export function ZScreen({
  children,
  edges = ['top', 'bottom'],
  className = '',
  testID,
}: {
  children: ReactNode;
  edges?: readonly ZScreenEdge[];
  className?: string;
  testID?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      testID={testID}
      className={`flex-1 bg-z-bg ${className}`}
      style={{
        paddingTop: edges.includes('top') ? insets.top : 0,
        paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      {children}
    </View>
  );
}
