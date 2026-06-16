/**
 * ZFab — shared public API types (Tier: Native)
 *
 * Material 3 Floating Action Button — ANDROID ONLY. iOS surfaces the same action
 * via a nav-bar "+", so the iOS variant renders null (and screens guard with
 * Platform.OS === 'android' anyway).
 *   - z-fab.tsx          — NativeWind pill fallback (web / Storybook / jest)
 *   - z-fab.ios.tsx      — renders null
 *   - z-fab.android.tsx  — ExtendedFloatingActionButton (or round FAB when not extended)
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
  /** NativeWind classes for positioning (e.g. "absolute right-6"). */
  className?: string;
  /** Style for the outer wrapper (e.g. dynamic bottom inset). */
  style?: StyleProp<ViewStyle>;
  testID?: string;
};
