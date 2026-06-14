/**
 * ZIconButton — shared public API types (Tier: Native)
 *
 * Platform variants:
 *   - z-icon-button.tsx         — NativeWind fallback (web / Storybook / jest)
 *   - z-icon-button.ios.tsx     — SwiftUI borderless/bordered Button via @expo/ui/swift-ui
 *   - z-icon-button.android.tsx — Jetpack Compose IconButton / FAB via @expo/ui/jetpack-compose
 *
 * Size/variant → native mapping:
 *   iOS:     ghost/secondary/primary → buttonStyle('borderless'/'bordered'/'borderedProminent')
 *            lg+circle variant stays a standard icon button; iOS FAB = nav-bar button (handled in navigation).
 *   Android: ghost → IconButton; secondary → OutlinedIconButton; primary → FilledIconButton
 *            lg+circle variant → FloatingActionButton (Material 3 standard FAB)
 */

import type { ReactNode } from 'react';

export type ZIconButtonVariant = 'primary' | 'secondary' | 'ghost';
// `lg` has no web counterpart yet; it exists for the mobile FAB.
export type ZIconButtonSize = 'sm' | 'md' | 'lg';
export type ZIconButtonShape = 'rounded' | 'circle';

export type ZIconButtonProps = {
  /** Accessibility label — required for screen readers. */
  label: string;
  /** Icon content (ZSymbol or any icon node). */
  children: ReactNode;
  /** Callback fired when the button is pressed. */
  onPress?: () => void;
  /**
   * Visual style variant.
   * - `ghost`     — no chrome (default); standard icon action
   * - `secondary` — bordered / outlined icon button
   * - `primary`   — filled / tinted icon button; use for FAB (size='lg' shape='circle')
   * @default 'ghost'
   */
  variant?: ZIconButtonVariant;
  /**
   * Button size.
   * - `sm` — 36 dp touch target
   * - `md` — 44 dp touch target (default)
   * - `lg` — 56 dp touch target; combined with shape='circle' produces a FAB
   * @default 'md'
   */
  size?: ZIconButtonSize;
  /**
   * Button shape.
   * - `rounded` — rounded rectangle (default)
   * - `circle`  — circular; use with size='lg' for FAB
   * @default 'rounded'
   */
  shape?: ZIconButtonShape;
  /** When true, the button is non-interactive and visually dimmed. */
  disabled?: boolean;
  /** Layout-only extensions (margins, positioning) — never visual identity. */
  className?: string;
  /** Test identifier forwarded to the native element. */
  testID?: string;
};
