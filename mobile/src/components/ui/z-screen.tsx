import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ZScreenEdge = 'top' | 'bottom';

/**
 * Shared screen wrapper that keeps content out of the status bar, display
 * cutout, and gesture/navigation areas (Android renders edge-to-edge).
 * Horizontal insets are always applied.
 *
 * ## Post-native-header inset contract (NativeTabs + per-tab Stacks world)
 *
 * | Screen type                                     | edges to pass          |
 * |-------------------------------------------------|------------------------|
 * | Login / auth callback (no native header)        | default `['top','bottom']` |
 * | Call fullScreenModal (no header, own chrome)    | `['top','bottom']` or per-state |
 * | Detail / form screen (native stack header)      | `['bottom']`           |
 * | Modal sheet (formSheet with native header)      | `['bottom']`           |
 * | Tab index screens (header + NativeTabs bar)     | `[]`                   |
 *
 * **Tab screens** pass `edges={[]}` because:
 *  - The native-stack header already occupies the top safe-area.
 *  - `contentInsetAdjustmentBehavior="automatic"` on the root ScrollView/FlatList
 *    lets iOS auto-inset content for both the large-title header collapse and the
 *    UITabBar. Android bottom inset is handled by explicit `contentContainerStyle`
 *    bottom padding on the inner list (NativeTabs cannot report its height).
 *
 * **Detail/form screens** pass `edges={['bottom']}` because the native stack
 * header owns the top safe-area; only the home-indicator/gesture area needs
 * padding at the bottom (no tab bar present on pushed screens).
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
