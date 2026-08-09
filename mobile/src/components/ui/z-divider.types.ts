/**
 * ZDivider — shared public API types (Tier: custom-no-native)
 *
 * ZDivider is a single-file Custom-RN primitive: a thin separator line. There is
 * no OS-widget counterpart, so (like ZBadge / ZSwitch) it is ONE cross-platform
 * file — `z-divider.tsx` — that branches on `Platform.OS` only for the stroke
 * weight (1dp Android / 0.5pt iOS hairline). No platform split, no jest mapper.
 *
 * Colors come exclusively from the `outline` role token (color('outline')).
 * Never raw hex.
 */

import type { StyleProp, ViewStyle } from 'react-native';

export type ZDividerProps = {
  /**
   * Orientation. Horizontal (default) renders a hairline rule that stretches to
   * the parent width; vertical renders a hairline rule spanning the full height.
   * @default false
   */
  vertical?: boolean;
  /**
   * Table-separator inset along the cross axis.
   *   - `true`   → the default 16dp inset (M3 / HIG table separator).
   *   - a number → that exact inset in dp, e.g. to align the separator under the
   *     title past a leading avatar/icon-tile in an inset-grouped list.
   *   - `false`  → full-bleed (no inset).
   * Applied as a margin on a stretched line, so it never overflows the parent.
   * @default false
   */
  inset?: boolean | number;
  /**
   * Consumer layout classes (margins, alignment). Applied to the line node.
   */
  className?: string;
  /** Extra inline style merged onto the line View. */
  style?: StyleProp<ViewStyle>;
  testID?: string;
};
