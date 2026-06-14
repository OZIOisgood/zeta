/**
 * ZButton — NativeWind fallback (web / Storybook / jest).
 *
 * This file is the public contract and test surface for ZButton. It renders
 * correctly in react-native-web-vite Storybook and passes jest via RNTL.
 *
 * Native internals live in:
 *   - z-button.ios.tsx      (SwiftUI Button via @expo/ui/swift-ui)
 *   - z-button.android.tsx  (Jetpack Compose Button via @expo/ui/jetpack-compose)
 *
 * DO NOT add @expo/ui imports here — this file must work in the web/Storybook
 * environment where native modules are unavailable.
 */

import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import type { ZButtonProps, ZButtonVariant } from './z-button.types';

export type { ZButtonVariant, ZButtonProps } from './z-button.types';

const containerClasses: Record<ZButtonVariant, string> = {
  primary: 'bg-z-primary active:bg-z-primary-strong',
  secondary: 'bg-z-surface border border-z-border active:bg-z-surface-warm',
  ghost: 'bg-transparent active:bg-z-surface-muted',
  danger: 'bg-z-danger active:opacity-90',
  // Inline primary-colored text link (web's `text-sm text-[var(--z-primary)]`
  // anchor): transparent, no button chrome, dims on press.
  link: 'bg-transparent active:opacity-70',
};

const labelClasses: Record<ZButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-z-text',
  ghost: 'text-z-muted',
  danger: 'text-white',
  link: 'text-z-primary',
};

/** Spinner color matching each variant's label color. */
const spinnerColor: Record<ZButtonVariant, string> = {
  primary: colors.onPrimary,
  secondary: colors.text,
  ghost: colors.text,
  danger: colors.onPrimary,
  link: colors.primary,
};

export function ZButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  testID,
}: ZButtonProps) {
  const isDisabled = disabled || loading;
  const isLink = variant === 'link';
  // The link variant drops the button chrome (padding/rounding) and uses the
  // web link's 14px size; all other variants keep the standard button sizing.
  const chromeClasses = isLink ? '' : 'rounded-lg px-4 py-3';
  // All variants use the web's 14px label size; only the link variant changes chrome.
  const labelSizeClasses = 'text-sm';
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      className={`flex-row items-center justify-center gap-2 ${chromeClasses} ${containerClasses[variant]} ${isDisabled ? 'opacity-50' : ''}`}
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
      <Text className={`${labelSizeClasses} font-semibold ${labelClasses[variant]}`}>{label}</Text>
    </Pressable>
  );
}
