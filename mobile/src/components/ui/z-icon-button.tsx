/**
 * ZIconButton — NativeWind fallback (web / Storybook / jest).
 *
 * This file is the public contract and test surface for ZIconButton. It renders
 * correctly in react-native-web-vite Storybook and passes jest via RNTL.
 *
 * Native internals live in:
 *   - z-icon-button.ios.tsx     (SwiftUI Button via @expo/ui/swift-ui)
 *   - z-icon-button.android.tsx (Jetpack Compose IconButton/FAB via @expo/ui/jetpack-compose)
 *
 * DO NOT add @expo/ui imports here — this file must work in the web/Storybook
 * environment where native modules are unavailable.
 */

import { Pressable } from 'react-native';
import type { ZIconButtonProps, ZIconButtonVariant, ZIconButtonSize } from './z-icon-button.types';

export type { ZIconButtonVariant, ZIconButtonSize, ZIconButtonShape, ZIconButtonProps } from './z-icon-button.types';

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
}: ZIconButtonProps) {
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
