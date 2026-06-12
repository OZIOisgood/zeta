import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

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
  icon,
  testID,
}: {
  label: string;
  onPress?: () => void;
  variant?: ZButtonVariant;
  disabled?: boolean;
  /** Optional leading icon node. */
  icon?: ReactNode;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`flex-row items-center justify-center gap-2 rounded-lg px-4 py-3 ${containerClasses[variant]} ${disabled ? 'opacity-50' : ''}`}
    >
      {icon ? <View>{icon}</View> : null}
      <Text className={`text-base font-semibold ${labelClasses[variant]}`}>{label}</Text>
    </Pressable>
  );
}
