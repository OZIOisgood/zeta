/**
 * ZButton — shared public API types (Tier: Native)
 *
 * These types are shared across all platform variants:
 *   - z-button.tsx          — NativeWind fallback (web / Storybook / jest)
 *   - z-button.ios.tsx      — SwiftUI Button via @expo/ui/swift-ui
 *   - z-button.android.tsx  — Jetpack Compose Button via @expo/ui/jetpack-compose
 *
 * The bare .tsx fallback is the contract doc and test surface; the native
 * variants (.ios/.android) must implement the same props without deviation.
 */

import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export type ZButtonVariant = 'primary' | 'tonal' | 'secondary' | 'ghost' | 'danger' | 'link';

export type ZButtonProps = {
  /** User-visible label text; also the accessibilityLabel. */
  label: string;
  /** Callback fired when the button is pressed. */
  onPress?: () => void;
  /**
   * Visual style variant.
   * - `primary`   — brand-accent filled; main call-to-action.
   * - `tonal`     — secondary-container fill (Material-3 tonal button); the
   *                 recommended lower-emphasis action — softer than `primary`
   *                 but more prominent than `secondary`/`ghost`.
   * - `secondary` — outlined / bordered; secondary action.
   * - `ghost`     — no chrome; tertiary / in-context action.
   * - `danger`    — destructive action (red).
   * - `link`      — plain inline text link in accent color.
   * @default 'primary'
   */
  variant?: ZButtonVariant;
  /** When true, the button is non-interactive and visually dimmed. */
  disabled?: boolean;
  /** When true, shows a loading indicator and disables the button. */
  loading?: boolean;
  /** Optional leading icon node (lucide icon or ZSymbol). */
  icon?: ReactNode;
  /** NativeWind classes for the outer wrapper (margins, alignment, positioning). */
  className?: string;
  /** Style for the outer wrapper. */
  style?: StyleProp<ViewStyle>;
  /** Test identifier forwarded to the native element. */
  testID?: string;
};
