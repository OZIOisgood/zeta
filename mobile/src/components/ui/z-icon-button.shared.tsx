import { Pressable } from 'react-native';

import type { ZIconButtonProps, ZIconButtonVariant, ZIconButtonSize } from './z-icon-button.types';

const containerClasses: Record<ZIconButtonVariant, string> = {
  primary: 'border border-z-primary-strong bg-z-primary-strong active:opacity-90',
  secondary: 'border border-z-border bg-z-surface active:bg-z-surface-warm',
  ghost: 'bg-transparent active:bg-z-surface-warm',
};

const sizeClasses: Record<ZIconButtonSize, string> = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-14 w-14',
};

/**
 * ZIconButton — shared RN implementation.
 *
 * Icon-only action. Mobile counterpart of the web `z-icon-button`
 * wrapper (web/dashboard-next/src/app/shared/ui/icon-button/).
 * Pass the icon as children; `label` is the accessible name.
 * A FAB is `variant="primary" size="lg" shape="circle"` plus positioning.
 *
 * Consumed by BOTH the bare entry (web / Storybook / jest) and the Android
 * entry — see z-icon-button.android.tsx for why Android retreats from Compose.
 * Static className only (no function-style props — NativeWind drops those on
 * Pressable on device).
 */
export function ZIconButtonShared({
  label,
  children,
  onPress,
  variant = 'ghost',
  size = 'md',
  shape = 'rounded',
  disabled = false,
  className = '',
  testID,
}: ZIconButtonProps) {
  // The documented FAB combination renders the Material 3 FAB geometry
  // (56dp rounded square, 16dp corners) instead of a plain circle.
  const isFab = variant === 'primary' && size === 'lg' && shape === 'circle';
  const radiusClass = isFab ? 'rounded-2xl' : shape === 'circle' ? 'rounded-full' : 'rounded-md';
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`items-center justify-center ${radiusClass} ${sizeClasses[size]} ${containerClasses[variant]} ${disabled ? 'opacity-50' : ''} ${className}`}
    >
      {children}
    </Pressable>
  );
}
