import { Pressable, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors } from '../../theme/colors';

/**
 * Boolean checkbox row. Mobile counterpart of the web `z-checkbox` wrapper
 * (web/dashboard-next/src/app/shared/ui/checkbox/). A pressable row with a box
 * and an optional trailing label.
 */
export function ZCheckbox({
  value,
  onValueChange,
  label,
  labelClassName,
  disabled = false,
  testID,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  labelClassName?: string;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      className={`flex-row items-center gap-2 ${disabled ? 'opacity-50' : ''}`}
    >
      <View
        className={`h-5 w-5 items-center justify-center rounded border ${
          value ? 'border-z-primary bg-z-primary' : 'border-z-border bg-z-surface'
        }`}
      >
        {value ? <Check color={colors.onPrimary} size={14} /> : null}
      </View>
      {label ? (
        <Text className={`text-sm text-z-text ${labelClassName ?? ''}`}>{label}</Text>
      ) : null}
    </Pressable>
  );
}
