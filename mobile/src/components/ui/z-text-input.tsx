import { TextInput } from 'react-native';
import { colors } from '../../theme/colors';
import type { ZTextInputProps } from './z-text-input.types';

export type { ZTextInputProps } from './z-text-input.types';

/**
 * Single-line text input — NativeWind fallback (web / Storybook / jest).
 *
 * Mobile counterpart of the web `z-text-input` wrapper
 * (web/dashboard-next/src/app/shared/ui/text-input/).
 *
 * On iOS this file is superseded by z-text-input.ios.tsx (SwiftUI TextField).
 * On Android this file is superseded by z-text-input.android.tsx (Compose
 * OutlinedTextField). This bare fallback is the test surface and Storybook
 * entry point.
 */
export function ZTextInput({
  value,
  onChangeText,
  accessibilityLabel,
  placeholder = '',
  invalid = false,
  disabled = false,
  testID,
  autoCapitalize,
  autoCorrect,
  returnKeyType,
  onSubmitEditing,
}: ZTextInputProps) {
  return (
    <TextInput
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      editable={!disabled}
      autoCapitalize={autoCapitalize}
      autoCorrect={autoCorrect}
      returnKeyType={returnKeyType}
      onSubmitEditing={onSubmitEditing}
      className={`min-h-11 w-full rounded-md border px-3 py-2 text-sm ${
        disabled ? 'bg-z-surface-warm text-z-muted' : 'bg-z-surface text-z-text'
      } ${invalid ? 'border-z-danger' : 'border-z-border'}`}
    />
  );
}
