/**
 * ZChip — shared public API types (Tier: Native)
 *
 * Platform variants:
 *   - z-chip.tsx         — NativeWind fallback (web / Storybook / jest)
 *   - z-chip.ios.tsx     — SwiftUI bordered capsule Button via @expo/ui/swift-ui
 *   - z-chip.android.tsx — Material 3 FilterChip via @expo/ui/jetpack-compose
 *
 * Native mapping:
 *   iOS:     buttonStyle('bordered') — tinted when selected (accent tint).
 *            The HIG "tag" / "filter chip" concept is a bordered capsule
 *            button that toggles tint on selection. iOS NEVER shows a leading
 *            check — selection is expressed by the capsule tint alone.
 *   Android: FilterChip — Material 3 filter chip with built-in selected state.
 *            Selected renders the warm secondary-container fill + a leading
 *            check (Material You "on" state).
 */

export type ZChipProps = {
  /** Display text inside the chip. Also the accessibilityLabel. */
  label: string;
  /** Whether the chip is currently selected. */
  selected?: boolean;
  /** Callback fired when the chip is pressed. */
  onPress?: () => void;
  /** When true, the chip is non-interactive. */
  disabled?: boolean;
  /**
   * Controls the leading check rendered in the selected MATERIAL state
   * (bare fallback + Android FilterChip). Defaults to `true`.
   * iOS ignores this — the iOS capsule never shows a check.
   */
  showCheck?: boolean;
  /** Test identifier forwarded to the native element. */
  testID?: string;
};
