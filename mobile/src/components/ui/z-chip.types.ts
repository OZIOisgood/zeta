/**
 * ZChip — shared public API types (Tier: Native)
 *
 * Platform variants:
 *   - z-chip.tsx         — NativeWind fallback (web / Storybook / jest)
 *   - z-chip.ios.tsx     — SwiftUI bordered capsule Button via @expo/ui/swift-ui
 *   - z-chip.android.tsx — Material 3 FilterChip via @expo/ui/jetpack-compose
 *
 * Native mapping:
 *   iOS:     buttonStyle('bordered') — tinted when selected (accent tint)
 *            The HIG "tag" / "filter chip" concept is a bordered capsule
 *            button that toggles tint on selection.
 *   Android: FilterChip — Material 3 filter chip with built-in selected state,
 *            accent-colored selectedContainerColor.
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
  /** Test identifier forwarded to the native element. */
  testID?: string;
};
