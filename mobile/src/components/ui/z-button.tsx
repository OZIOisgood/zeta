import { Pressable, Text } from 'react-native';

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

export function ZButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
}: {
  label: string;
  onPress?: () => void;
  variant?: ZButtonVariant;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`items-center justify-center rounded-lg px-4 py-3 ${containerClasses[variant]} ${disabled ? 'opacity-50' : ''}`}
    >
      <Text className={`text-base font-semibold ${labelClasses[variant]}`}>{label}</Text>
    </Pressable>
  );
}
