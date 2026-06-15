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
   * Optional extra NativeWind classes (bare/.tsx fallback only).
   * The class string is concatenated naively after the base classes,
   * preserving the existing behavior exactly.
   */
  className?: string;
  /** Test identifier forwarded to the root element. */
  testID?: string;
};
