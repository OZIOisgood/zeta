/**
 * ZCombobox — shared public API types (Tier: Custom-RN)
 *
 * ZCombobox is a Custom-RN primitive: no @expo/ui / OS-widget equivalent.
 * The trigger is a hand-styled Pressable + NativeWind; on native it navigates
 * to the pushed /select/[field] search screen (HIG "Search interfaces" /
 * Material 3 "Search bar + list") instead of opening an inline Modal.
 *
 * Platform variants:
 *   - z-combobox.tsx          — NativeWind fallback (web / Storybook / jest)
 *   - z-combobox.ios.tsx      — Custom-RN trigger → pushed /select/[field] screen
 *   - z-combobox.android.tsx  — Custom-RN trigger → pushed /select/[field] screen
 *
 * The bare .tsx fallback is the contract doc and test surface; the native
 * variants (.ios/.android) must implement the same props without deviation.
 */

export type ZComboboxOption = { value: string; label: string };

export type ZComboboxProps = {
  /** Currently selected value; when undefined the placeholder is shown. */
  value?: string;
  /** The list of options to choose from. */
  options: ZComboboxOption[];
  /** Text shown in the trigger when no value is selected. */
  placeholder?: string;
  /** Callback fired when the user picks a new value. */
  onValueChange: (value: string) => void;
  /** When true, renders an error/danger visual state. */
  invalid?: boolean;
  /** When true, the trigger is non-interactive and visually dimmed. */
  disabled?: boolean;
  /** Accessibility label for the trigger element. */
  accessibilityLabel?: string;
  /** Placeholder shown inside the search field on the selection screen. */
  searchPlaceholder?: string;
  /** Accessibility label for the backdrop close area (bare fallback only). */
  closeLabel?: string;
  /** Test identifier forwarded to the trigger element. */
  testID?: string;
};
