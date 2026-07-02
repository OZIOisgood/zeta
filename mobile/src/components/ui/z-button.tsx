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
 *
 * Layout: the Pressable is wrapped in a <View> that forwards `className`/`style`
 * and uses `alignItems:'flex-start'` so the button stays content-width (matching
 * the native variants); the parent's alignment positions the wrapper.
 */

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import type { ZButtonProps, ZButtonVariant } from './z-button.types';

export type { ZButtonVariant, ZButtonProps } from './z-button.types';

const containerClasses: Record<ZButtonVariant, string> = {
  primary: 'bg-z-primary-strong active:opacity-90',
  // Material-3 tonal button: secondary-container fill, lower-emphasis. Dims on press.
  tonal: 'bg-secondary-container active:opacity-90',
  secondary: 'bg-z-surface border border-z-border active:bg-z-surface-warm',
  ghost: 'bg-transparent active:bg-z-surface-muted',
  danger: 'bg-z-danger active:opacity-90',
  // Low-emphasis destructive: red outline, transparent fill, soft-red press tint.
  'danger-outline': 'bg-transparent border border-z-danger active:bg-z-danger-soft',
  // Inline primary-colored text link (web's `text-sm text-[var(--z-primary)]`
  // anchor): transparent, no button chrome, dims on press.
  link: 'bg-transparent active:opacity-70',
};

const labelClasses: Record<ZButtonVariant, string> = {
  primary: 'text-white',
  tonal: 'text-on-secondary-container',
  secondary: 'text-z-text',
  ghost: 'text-z-muted',
  danger: 'text-white',
  'danger-outline': 'text-z-danger',
  // AA-safe deep accent for the inline link text (z-primary #ea580c is 3.56:1 on
  // white; z-primary-strong #c2410c is 5.18:1).
  link: 'text-z-primary-strong',
};

/** Spinner color matching each variant's label color. */
const spinnerColor: Record<ZButtonVariant, string> = {
  primary: colors.onPrimary,
  // Role tokens (onSecondaryContainer) don't flow into the flat `colors` map;
  // use the light-mode onSecondaryContainer hex to match the tonal label color.
  tonal: '#5a3214',
  secondary: colors.text,
  ghost: colors.text,
  danger: colors.onPrimary,
  'danger-outline': colors.danger,
  link: colors.primary,
};

export function ZButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  className,
  style,
  testID,
}: ZButtonProps) {
  const isDisabled = disabled || loading;
  const isLink = variant === 'link';
  // The link variant drops the button chrome (padding/rounding) and uses the
  // web link's 14px size; all other variants keep the standard button sizing.
  // Non-link chrome uses a pill radius (rounded-full) to match the native M3/HIG
  // pill shape of the .ios/.android variants.
  const chromeClasses = isLink ? '' : 'rounded-full px-4 py-3';
  // All variants use the web's 14px label size; only the link variant changes chrome.
  const labelSizeClasses = 'text-sm';
  return (
    // fullWidth: drop the content-width `alignItems:'flex-start'` so the
    // Pressable stretches to the wrapper's full width.
    <View className={className} style={[fullWidth ? null : styles.wrap, style]}>
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
        <Text className={`${labelSizeClasses} ${isLink ? 'font-bold' : 'font-semibold'} ${labelClasses[variant]}`}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-start' },
});
