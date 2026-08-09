import { TextInput } from 'react-native';
import { colors } from '../../theme/colors';
import type { ZTextInputProps } from './z-text-input.types';

/**
 * Material-3 outlined field geometry (handoff UI kit):
 *   - min-h-14   → 56dp min height (M3 outlined text-field height).
 *   - rounded-xl → 12dp corner radius (M3 field radius).
 *   - bg-surface → surface fill behind the outline so the outlined look reads
 *                  on the warm background.
 *   - border-outline (default) / border-role-danger (invalid) → role tokens.
 * Accent focus is rendered with an inset ring so the border width never grows
 * (`focus:border-accent` swaps color only; `ring-inset` keeps it inside the box
 * → no layout shift). On native (iOS/Android) focus is handled by the OS widget;
 * this ring is the NativeWind web/jest contract only.
 */


export type { ZTextInputProps } from './z-text-input.types';

/**
 * Single-line text input — NativeWind fallback (web / Storybook / jest).
 *
 * Mobile counterpart of the web `z-text-input` wrapper
 * (web/dashboard-next/src/app/shared/ui/text-input/).
 *
 * On iOS this file is superseded by z-text-input.ios.tsx (SwiftUI TextField).
 * On Android this file is superseded by z-text-input.android.tsx (Compose
 * OutlinedTextField). This bare fallback is the test surface and Storybook
 * entry point.
 */
export function ZTextInput({
  value,
  onChangeText,
  accessibilityLabel,
  placeholder = '',
  invalid = false,
  disabled = false,
  testID,
  autoCapitalize,
  autoCorrect,
  returnKeyType,
  onSubmitEditing,
}: ZTextInputProps) {
  return (
    <TextInput
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      editable={!disabled}
      autoCapitalize={autoCapitalize}
      autoCorrect={autoCorrect}
      returnKeyType={returnKeyType}
      onSubmitEditing={onSubmitEditing}
      className={`min-h-14 w-full rounded-xl border px-3 py-2 text-sm focus:border-accent focus:ring-1 focus:ring-inset focus:ring-accent ${
        disabled ? 'bg-surface-variant text-on-surface-variant' : 'bg-background text-on-surface'
      } ${invalid ? 'border-role-danger' : 'border-outline'}`}
    />
  );
}
