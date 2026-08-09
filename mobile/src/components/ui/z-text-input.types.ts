/**
 * ZTextInput — shared public API types (Tier: Native)
 *
 * These types are shared across all platform variants:
 *   - z-text-input.tsx          — NativeWind fallback (web / Storybook / jest)
 *   - z-text-input.ios.tsx      — SwiftUI TextField via @expo/ui/swift-ui
 *   - z-text-input.android.tsx  — Jetpack Compose OutlinedTextField via @expo/ui/jetpack-compose
 *
 * The bare .tsx fallback is the contract doc and test surface; the native
 * variants (.ios/.android) must implement the same props without deviation.
 */

import type { TextInputProps } from 'react-native';

export type ZTextInputProps = {
  /** Current text value (controlled). */
  value: string;
  /** Callback fired whenever the text changes. */
  onChangeText: (value: string) => void;
  /** Accessibility label for the input element. */
  accessibilityLabel: string;
  /** Placeholder text shown when the field is empty. */
  placeholder?: string;
  /** When true, renders an error/danger visual state. */
  invalid?: boolean;
  /** When true, the field is non-editable and visually dimmed. */
  disabled?: boolean;
  /** Test identifier forwarded to the native element. */
  testID?: string;
  /** Auto-capitalisation behaviour. */
  autoCapitalize?: TextInputProps['autoCapitalize'];
  /** Whether autocorrect is enabled. */
  autoCorrect?: boolean;
  /** Return key label on the software keyboard. */
  returnKeyType?: TextInputProps['returnKeyType'];
  /** Called when the user presses the return/submit key. */
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
};
