import { Pressable, Text } from 'react-native';

/**
 * Selectable pill for single-choice option rows (group picker, video parts).
 * No web counterpart yet; the visual language follows the web status chips
 * (`z-badge`) and the Zeta tokens.
 */
export function ZChip({
  label,
  selected = false,
  onPress,
  disabled = false,
  testID,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`rounded-full border px-3 py-1.5 ${
        selected ? 'border-z-primary bg-z-primary-soft' : 'border-z-border bg-z-surface'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <Text className={`text-sm font-medium ${selected ? 'text-z-primary-strong' : 'text-z-text'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
