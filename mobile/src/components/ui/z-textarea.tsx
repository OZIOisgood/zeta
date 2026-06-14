import { TextInput } from 'react-native';
import { colors } from '../../theme/colors';
import type { ZTextareaProps } from './z-textarea.types';

export type { ZTextareaProps } from './z-textarea.types';

/**
 * Multi-line text input — NativeWind fallback (web / Storybook / jest).
 *
 * Mobile counterpart of the web `z-textarea` wrapper
 * (web/dashboard-next/src/app/shared/ui/textarea/).
 *
 * On iOS this file is superseded by z-textarea.ios.tsx (SwiftUI TextField,
 * axis: vertical). On Android this file is superseded by z-textarea.android.tsx
 * (Compose OutlinedTextField, multiline). This bare fallback is the test
 * surface and Storybook entry point.
 */
export function ZTextarea({
  value,
  onChangeText,
  accessibilityLabel,
  placeholder = '',
  rows = 4,
  invalid = false,
  disabled = false,
  testID,
}: ZTextareaProps) {
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
      multiline
      numberOfLines={rows}
      textAlignVertical="top"
      className={`min-h-20 w-full rounded-md border px-3 py-2 text-sm ${
        disabled ? 'bg-z-surface-warm text-z-muted' : 'bg-z-surface text-z-text'
      } ${invalid ? 'border-z-danger' : 'border-z-border'}`}
    />
  );
}
