/**
 * ZCard — shared public API types (Tier: Native)
 *
 * Platform variants:
 *   - z-card.tsx          — NativeWind fallback (web / Storybook / jest)
 *   - z-card.ios.tsx      — role-token-styled RN View (inset-grouped feel)
 *   - z-card.android.tsx  — @expo/ui/jetpack-compose Card (Material 3 surface)
 *
 * iOS note: SwiftUI `Section` only works inside a List/Form, so iOS uses a
 * role-token-styled RN View (surface background, ~12px corner radius, subtle
 * shadow) to approximate the inset-grouped feel — see z-card.ios.tsx.
 */

import type { ReactNode } from 'react';

export type ZCardProps = {
  /** Card content. */
  children: ReactNode;
  /**
   * Tonal tier of the card fill (Material You — the tint carries elevation):
   *   - 'surface'   (default) warm neutral tonal surface — the standard card.
   *   - 'accent'    accentContainer fill — call-to-action / featured surface.
   *   - 'secondary' secondaryContainer fill — secondary emphasis surface.
   * @default 'surface'
   */
  tone?: 'surface' | 'accent' | 'secondary';
  /**
   * Hero card: a larger corner radius (28dp instead of 20dp) for prominent,
   * full-width feature cards. Does not change the fill — combine with `tone`.
   * @default false
   */
  hero?: boolean;
  /**
   * Surface treatment:
   *   - 'filled'   (default) the tonal-surface look — borderless, the fill tint
   *                provides separation from the canvas (Material You direction).
   *   - 'outlined' legacy look: white fill + a warm hairline `outline` border.
   *   - 'elevated' legacy look: a soft drop shadow instead of a tonal fill.
   * @default 'filled'
   */
  variant?: 'filled' | 'outlined' | 'elevated';
  /**
   * Optional extra NativeWind classes (bare/.tsx fallback only).
   * The class string is concatenated naively after the base classes,
   * preserving the existing behavior exactly (consumer layout classes win).
   */
  className?: string;
  /** Test identifier forwarded to the root element. */
  testID?: string;
};
