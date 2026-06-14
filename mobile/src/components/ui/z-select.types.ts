/**
 * ZSelect — shared public API types (Tier: Native)
 *
 * These types are shared across all platform variants:
 *   - z-select.tsx          — NativeWind fallback (web / Storybook / jest)
 *   - z-select.ios.tsx      — SwiftUI Picker(menu) via @expo/ui/swift-ui
 *   - z-select.android.tsx  — Jetpack Compose ExposedDropdownMenuBox via @expo/ui/jetpack-compose
 *
 * The bare .tsx fallback is the contract doc and test surface; the native
 * variants (.ios/.android) must implement the same props without deviation.
 */

export type ZSelectOption = { value: string; label: string };

export type ZSelectProps = {
  /** Currently selected value; when undefined the placeholder is shown. */
  value?: string;
  /** The list of options to choose from. */
  options: ZSelectOption[];
  /** Text shown in the trigger when no value is selected. */
  placeholder?: string;
  /** Callback fired when the user picks a new value. */
  onValueChange: (value: string) => void;
  /** When true, renders an error/danger visual state. */
  invalid?: boolean;
  /** When true, the picker is non-interactive and visually dimmed. */
  disabled?: boolean;
  /** Accessibility label for the trigger element. */
  accessibilityLabel?: string;
  /** Test identifier forwarded to the native element. */
  testID?: string;
};
