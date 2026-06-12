import { TextInput } from 'react-native';
import { colors } from '../../theme/colors';

/**
 * Multi-line text input. Mobile counterpart of the web `z-textarea`
 * wrapper (web/dashboard-next/src/app/shared/ui/textarea/).
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
}: {
  value: string;
  onChangeText: (value: string) => void;
  accessibilityLabel: string;
  placeholder?: string;
  rows?: number;
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
      multiline
      numberOfLines={rows}
      textAlignVertical="top"
      className={`min-h-20 w-full rounded-md border px-3 py-2 ${
        disabled ? 'bg-z-surface-warm text-z-muted' : 'bg-z-surface text-z-text'
      } ${invalid ? 'border-z-danger' : 'border-z-border'}`}
    />
  );
}
