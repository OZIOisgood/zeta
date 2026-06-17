/**
 * ZDivider — shared public API types (Tier: Custom RN)
 *
 * ZDivider is a Custom-RN primitive: a thin separator line. There is no OS
 * widget counterpart for a standalone divider, so it is rendered as a thin
 * role-token-styled View. A platform split IS warranted because the stroke
 * width and default inset differ per platform (handoff spec):
 *   - Material (Android) → 1dp `outline` stroke, full bleed.
 *   - iOS                → 0.5pt (hairline) `outline` stroke; the inset variant
 *                          uses the 16pt horizontal table-separator inset.
 *
 * Platform files:
 *   - z-divider.tsx         — bare NativeWind fallback (web / Storybook / jest)
 *   - z-divider.ios.tsx     — 0.5pt hairline line via useRoleColors()
 *   - z-divider.android.tsx — 1dp line via useRoleColors()
 *
 * Colors come exclusively from the `outline` role token (bg-outline class in
 * the fallback / color('outline') in the native files). Never raw hex.
 */

import type { StyleProp, ViewStyle } from 'react-native';

export type ZDividerProps = {
  /**
   * Orientation. Horizontal (default) renders a 1px/hairline rule spanning the
   * full width; vertical renders a 1px/hairline rule spanning the full height.
   * @default false
   */
  vertical?: boolean;
  /**
   * Table-separator inset. Horizontal → 16dp left/right margin (mx-4);
   * vertical → 16dp top/bottom margin (my-4).
   * @default false
   */
  inset?: boolean;
  /**
   * Force a platform stroke style regardless of the running OS. Mainly useful
   * for stories/previews; native files default to their own platform.
   */
  platform?: 'material' | 'ios';
  /**
   * Consumer layout classes (margins, alignment). Forwarded onto the wrapper so
   * consumer layout wins. Required by the native className-forwarding contract.
   */
  className?: string;
  /** Extra inline style merged onto the line View. */
  style?: StyleProp<ViewStyle>;
  testID?: string;
};
