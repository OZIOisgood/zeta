/**
 * ZListItem — shared public API types (Tier: Custom-RN)
 *
 * Platform variants:
 *   - z-list-item.tsx      — Material 3 / bare fallback (web · Storybook · jest ·
 *                            Android). This Material look is the contract surface.
 *   - z-list-item.ios.tsx  — HIG grouped inset table-cell look.
 *
 * Why custom-no-native (not native), and why this split shape?
 *   A list ROW is a COMPOSITION (a pressable container holding arbitrary
 *   leading/title/subtitle/trailing nodes), NOT a single OS widget:
 *     - @expo/ui swift-ui exposes `List`/`Section` — CONTAINER widgets that
 *       manage their own rows via `List.ForEach`/selection and expose no
 *       per-row `onPress`. They are not a drop-in single-row primitive, and the
 *       consumer-passed leading/trailing are arbitrary RN node trees (ZAvatar,
 *       ZSymbol, ZSwitch) that cannot be slotted as native SwiftUI views.
 *     - @expo/ui jetpack-compose exposes `ListItem` with slot sub-components,
 *       but it carries no `onClick`/`onPress` and its slots expect native
 *       Compose content rather than arbitrary RN trees.
 *   So there is no clean OS-widget counterpart to wrap → Custom-RN, built from a
 *   `Touchable` (the sanctioned RN-Pressable home, which already centralises
 *   Android ripple / iOS pressed-dim + haptics + a11y) plus role-token text.
 *
 *   Only a `.ios.tsx` is added (no `.android.tsx`): the bare `.tsx` IS the
 *   Material/Android look, so an Android file would duplicate it. The split
 *   exists solely because the Material tile and the iOS grouped cell are
 *   genuinely distinct, and keeping the bare file as a pure Material contract
 *   (no Platform.OS branch — jest-expo defaults Platform.OS to 'ios', which
 *   would otherwise force the iOS branch in jest) yields the cleanest test
 *   surface. The package.json moduleNameMapper block forces jest to resolve the
 *   bare `.tsx`. Test 5 of primitive-contract (both platform files) applies only
 *   to the `native` tier, so a custom-no-native primitive may ship `.ios.tsx`
 *   without `.android.tsx`.
 *
 * Per-platform look:
 *   Android / bare (Material 3):
 *     - title 16 / weight 700, subtitle 15 / 400 (the app-wide "videos
 *       baseline" type scale — deliberately one step above the kit's 15/13)
 *     - 16dp container corner radius
 *     - selected fill = secondary-container; unselected = surface
 *     - M3 state layer: Touchable's Android ripple
 *   iOS (HIG grouped inset table cell):
 *     - title 17 regular (onSurface), subtitle 15 secondary (onSurfaceVariant)
 *     - taller padding (16pt vertical / 16pt horizontal), square corners
 *       (the enclosing card/section clips the group)
 *     - system pressed dim (no tonal fill) — Touchable's iOS pressed-opacity
 *
 * Colors come exclusively from role tokens (NativeWind classes) — no hex.
 *
 * Reference idioms:
 *   iOS    → grouped inset table rows, HIG Lists:
 *             https://developer.apple.com/design/human-interface-guidelines/lists
 *   Android → Material 3 list item:
 *             https://m3.material.io/components/lists/overview
 */

import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export type ZListItemProps = {
  /**
   * Leading node — an icon tile, avatar, or coloured glyph. Passed in by the
   * consumer (ZListItem does not hard-code ZIconTile/ZAvatar) so each row can
   * choose its own leading affordance.
   */
  leading?: ReactNode;
  /** Primary row label. */
  title: string;
  /**
   * Optional node rendered inline, right after the title text on the title
   * line (e.g. a ZBadge for "30 min"). The title truncates to make room; the
   * accessory keeps its size.
   */
  titleAccessory?: ReactNode;
  /** Optional secondary line below the title. */
  subtitle?: string;
  /**
   * Max lines the subtitle may wrap to before truncating. Defaults to 3. Pass 1
   * for fixed-height rows (e.g. a card with a fixed-size thumbnail) so a long
   * subtitle can't grow the row and desync it from the leading node's height.
   * @default 3
   */
  subtitleNumberOfLines?: number;
  /**
   * Max lines the title may wrap to before truncating. Defaults to 1 (list rows
   * keep a stable height). Pass 2 for message-style rows whose title carries
   * the actual content (e.g. notification rows) and must not truncate
   * mid-sentence on every row.
   * @default 1
   */
  titleNumberOfLines?: number;
  /**
   * Trailing node — a chevron, badge, switch, or other affordance. Passed in by
   * the consumer; ZListItem renders it right-aligned.
   */
  trailing?: ReactNode;
  /**
   * Press handler. Optional: some rows are non-interactive containers that
   * surface their own trailing controls (e.g. a Switch, ZButton, or ZIconButton).
   * When omitted the row renders as a plain `<View>` — NOT a pressable — so it
   * carries no button role, haptic, press feedback, or accessibility label; only
   * the inner controls are focusable.
   */
  onPress?: () => void;
  /**
   * Selected state — applies the tonal secondary-container fill (Material) and
   * announces `accessibilityState.selected`. iOS keeps the system look (no
   * tonal fill) but still announces selection.
   * @default false
   */
  selected?: boolean;
  /** When true the row is dimmed and press is blocked. */
  disabled?: boolean;
  /** Additional NativeWind class(es) applied to the row container. */
  className?: string;
  /** Inline style applied to the row container. */
  style?: StyleProp<ViewStyle>;
  /** Test identifier forwarded to the row container. */
  testID?: string;
};
