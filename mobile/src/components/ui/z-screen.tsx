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
 *    UITabBar.
 *  - Android needs NO bar/inset clearance: the NativeTabs host
 *    (react-native-screens) lays tab content ABOVE the M3 NavigationBar and
 *    the bar absorbs the system gesture inset (uiautomator-verified: content
 *    bottom == bar top). Screens with a FAB add ANDROID_FAB_LIST_CLEARANCE
 *    (src/lib/android-fab-clearance.ts) to the inner list's paddingBottom so
 *    the last row scrolls clear of the FAB; FABs anchor at
 *    `className="absolute bottom-4 right-6"`.
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
