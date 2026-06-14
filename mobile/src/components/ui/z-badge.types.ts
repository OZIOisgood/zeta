/**
 * ZBadge — shared public API types (Tier: Custom RN — shared implementation)
 *
 * ZBadge is a SEMANTIC STATUS PILL (success / warning / danger / primary / neutral).
 * Neither iOS nor Android has a native widget that maps to a "status pill" in
 * the Material 3 / HIG sense:
 *
 *   - Android @expo/ui Badge: a small notification dot / count badge — NOT a
 *     status pill. Its color slots are containerColor/contentColor with no tone
 *     semantics (success/warning/danger).
 *   - iOS SwiftUI has no Label-styled "chip" counterpart.
 *   - The closest Material 3 concept is AssistChip/SuggestionChip, but those
 *     are interactive and not status-display components.
 *
 * Decision: ZBadge stays as a single shared NativeWind implementation (no
 * .ios/.android split). Colors are driven by semantic role tokens from
 * theme/native.ts (via NativeWind classes mapped to those tokens), ensuring
 * correct light/dark behavior without any hardcoded hex values.
 *
 * This is the documented exception per the task brief:
 *   "If there's no meaningful native widget, you MAY keep a single shared
 *   implementation (no .ios/.android needed) as long as it uses role tokens."
 *
 * Platform files:
 *   - z-badge.tsx   — single shared NativeWind implementation (web / iOS / Android / jest)
 *
 * No .ios.tsx / .android.tsx — not applicable (see rationale above).
 */

export type ZBadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

export type ZBadgeProps = {
  /** The text displayed inside the badge. */
  label: string;
  /**
   * Semantic color tone.
   * - `neutral`  — muted, for informational status
   * - `primary`  — brand accent, for active/main state
   * - `success`  — green, for completed / live state
   * - `warning`  — amber, for at-risk / pending state
   * - `danger`   — red, for error / failed state
   * @default 'neutral'
   */
  tone?: ZBadgeTone;
  /** Test identifier forwarded to the native element. */
  testID?: string;
};
