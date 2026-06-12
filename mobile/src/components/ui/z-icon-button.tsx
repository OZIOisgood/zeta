import type { ReactNode } from 'react';
import { Pressable } from 'react-native';

export type ZIconButtonVariant = 'primary' | 'secondary' | 'ghost';
// `lg` has no web counterpart yet; it exists for the mobile FAB.
export type ZIconButtonSize = 'sm' | 'md' | 'lg';
export type ZIconButtonShape = 'rounded' | 'circle';

const containerClasses: Record<ZIconButtonVariant, string> = {
  primary: 'border border-z-primary bg-z-primary active:bg-z-primary-strong',
  secondary: 'border border-z-border bg-z-surface active:bg-z-surface-warm',
  ghost: 'bg-transparent active:bg-z-surface-warm',
};

const sizeClasses: Record<ZIconButtonSize, string> = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-14 w-14',
};

/**
 * Icon-only action. Mobile counterpart of the web `z-icon-button`
 * wrapper (web/dashboard-next/src/app/shared/ui/icon-button/).
 * Pass the icon as children; `label` is the accessible name.
 * A FAB is `variant="primary" size="lg" shape="circle"` plus positioning.
 */
export function ZIconButton({
  label,
  children,
  onPress,
  variant = 'ghost',
  size = 'md',
  shape = 'rounded',
  disabled = false,
  className = '',
  testID,
}: {
  label: string;
  children: ReactNode;
  onPress?: () => void;
  variant?: ZIconButtonVariant;
  size?: ZIconButtonSize;
  shape?: ZIconButtonShape;
  disabled?: boolean;
  /** Layout-only extensions (margins, positioning) — never visual identity. */
  className?: string;
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
      className={`items-center justify-center ${
        shape === 'circle' ? 'rounded-full' : 'rounded-md'
      } ${sizeClasses[size]} ${containerClasses[variant]} ${disabled ? 'opacity-50' : ''} ${className}`}
    >
      {children}
    </Pressable>
  );
}
