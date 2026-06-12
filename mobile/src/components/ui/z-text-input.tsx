import { TextInput } from 'react-native';
import { colors } from '../../theme/colors';

/**
 * Single-line text input. Mobile counterpart of the web `z-text-input`
 * wrapper (web/dashboard-next/src/app/shared/ui/text-input/).
 */
export function ZTextInput({
  value,
  onChangeText,
  accessibilityLabel,
  placeholder = '',
  invalid = false,
  disabled = false,
  testID,
}: {
  value: string;
  onChangeText: (value: string) => void;
  accessibilityLabel: string;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  testID?: string;
}) {
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
      className={`min-h-11 w-full rounded-md border px-3 py-2 ${
        disabled ? 'bg-z-surface-warm text-z-muted' : 'bg-z-surface text-z-text'
      } ${invalid ? 'border-z-danger' : 'border-z-border'}`}
    />
  );
}
