/**
 * ZSeekChip — shared public API types (Tier: Custom-RN)
 *
 * ZSeekChip is an ACCENT NAVIGATIONAL PILL: it renders a comment's
 * video-timecode (e.g. "▶ 0:12") as the primary "seek to this moment"
 * affordance on a review row. It is deliberately NOT a filter chip — the
 * accent-container fill + leading play glyph signal "tap to jump", not "tap
 * to filter".
 *
 * Neither iOS nor Android has a native widget that maps to this concept:
 *
 *   - Material 3 AssistChip/SuggestionChip and the iOS bordered capsule
 *     button are filter/selection affordances — they carry selection
 *     semantics and an outlined-surface look that contradicts the
 *     accent-container "seek" treatment the handoff asks for.
 *   - There is no OS primitive for a tabular-figure timecode pill with a
 *     leading play glyph used as a seek button.
 *
 * Decision: ZSeekChip stays as a single shared NativeWind implementation
 * (no .ios/.android split), mirroring ZBadge. Colors are driven by role
 * tokens (accentContainer / onAccentContainer) via NativeWind classes and
 * the theme/native.ts adapter, ensuring correct light/dark behavior with no
 * hardcoded hex values. Press behavior, haptics, and the button a11y role
 * come from the shared `Touchable` infra primitive.
 *
 * Platform files:
 *   - z-seek-chip.tsx  — single shared NativeWind implementation
 *                        (web / iOS / Android / jest)
 *
 * No .ios.tsx / .android.tsx — not applicable (see rationale above).
 */

export type ZSeekChipProps = {
  /** The timecode text displayed inside the pill (e.g. "0:12"). */
  label: string;
  /** Callback fired when the pill is pressed (seek to this moment). */
  onPress?: () => void;
  /** Accessibility label announced by VoiceOver/TalkBack (e.g. "Jump to 0:12"). */
  accessibilityLabel?: string;
  /** Test identifier forwarded to the underlying pressable. */
  testID?: string;
};
