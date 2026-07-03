/**
 * ZTextarea — shared public API types (Tier: Native)
 *
 * These types are shared across all platform variants:
 *   - z-textarea.tsx          — NativeWind fallback (web / Storybook / jest)
 *   - z-textarea.ios.tsx      — SwiftUI TextField (axis: vertical) via @expo/ui/swift-ui
 *   - z-textarea.android.tsx  — Jetpack Compose OutlinedTextField (multiline) via @expo/ui/jetpack-compose
 *
 * The bare .tsx fallback is the contract doc and test surface; the native
 * variants (.ios/.android) must implement the same props without deviation.
 */

export type ZTextareaProps = {
  /** Current text value (controlled). */
  value: string;
  /** Callback fired whenever the text changes. */
  onChangeText: (value: string) => void;
  /** Accessibility label for the input element. */
  accessibilityLabel: string;
  /** Placeholder text shown when the field is empty. */
  placeholder?: string;
  /** Number of visible text rows (approximate; exact rendering is platform-driven). */
  rows?: number;
  /** When true, renders an error/danger visual state. */
  invalid?: boolean;
  /** When true, the field is non-editable and visually dimmed. */
  disabled?: boolean;
  /** Test identifier forwarded to the native element. */
  testID?: string;
};
