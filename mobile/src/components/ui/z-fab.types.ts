/**
 * ZFab — shared public API types (Tier: Custom-RN)
 *
 * Material 3-style Floating Action Button — ANDROID ONLY. iOS surfaces the same
 * action via a nav-bar "+", so the iOS variant renders null (and screens guard
 * with Platform.OS === 'android' anyway).
 *
 * NativeWind, NOT @expo/ui. The @expo/ui ExtendedFloatingActionButton lived in a
 * Compose `Host`, and on a tab-switch re-layout (e.g. Videos↔Sessions) the Host
 * re-reported its width as the full available width — the FAB's left edge jumped
 * to x=0 and it spanned the screen. That is a Host measurement defect no RN-side
 * alignSelf/matchContents can override (the Host TELLS RN it is full-width). The
 * NativeWind pill hugs its content deterministically via Yoga, keeps the native
 * Android ripple (Touchable) + a 6dp M3 elevation, so it can never stretch. (Same
 * Custom-RN-with-a-platform-file shape as ZListItem.)
 *   - z-fab.tsx      — NativeWind pill (web / Storybook / jest / Android)
 *   - z-fab.ios.tsx  — renders null
 */
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export type ZFabProps = {
  /** Visible label (extended) + accessibilityLabel. */
  label: string;
  /** Leading icon node (a ZSymbol), pre-tinted by the caller. */
  icon: ReactNode;
  onPress: () => void;
  /** Show the label (extended). When false, an icon-only round FAB. @default true */
  extended?: boolean;
  /**
   * Emphasis / fill of the FAB.
   *   - `primary` — accent fill (high-emphasis, default).
   *   - `tonal`   — accent-container fill (lower-emphasis).
   * @default 'primary'
   */
  tone?: 'primary' | 'tonal';
  /** NativeWind classes for positioning (e.g. "absolute right-6"). */
  className?: string;
  /** Style for the outer wrapper (e.g. dynamic bottom inset). */
  style?: StyleProp<ViewStyle>;
  testID?: string;
};
