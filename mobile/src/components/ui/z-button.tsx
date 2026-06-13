import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

export type ZButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const containerClasses: Record<ZButtonVariant, string> = {
  primary: 'bg-z-primary active:bg-z-primary-strong',
  secondary: 'bg-z-surface border border-z-border active:bg-z-surface-warm',
  ghost: 'bg-transparent active:bg-z-surface-muted',
  danger: 'bg-z-danger active:opacity-90',
};

const labelClasses: Record<ZButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-z-text',
  ghost: 'text-z-text',
  danger: 'text-white',
};

/** Spinner color matching each variant's label color. */
const spinnerColor: Record<ZButtonVariant, string> = {
  primary: colors.onPrimary,
  secondary: colors.text,
  ghost: colors.text,
  danger: colors.onPrimary,
};

export function ZButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  testID,
}: {
  label: string;
  onPress?: () => void;
  variant?: ZButtonVariant;
  disabled?: boolean;
  /** When true, shows a spinner and disables the button. */
  loading?: boolean;
  /** Optional leading icon node. */
  icon?: ReactNode;
  testID?: string;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      className={`flex-row items-center justify-center gap-2 rounded-lg px-4 py-3 ${containerClasses[variant]} ${isDisabled ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator
          testID={testID ? `${testID}-spinner` : 'z-button-spinner'}
          size="small"
          color={spinnerColor[variant]}
        />
      ) : icon ? (
        <View>{icon}</View>
      ) : null}
      <Text className={`text-base font-semibold ${labelClasses[variant]}`}>{label}</Text>
    </Pressable>
  );
}
