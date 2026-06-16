import { TextInput } from 'react-native';
import { colors } from '../../theme/colors';
import type { ZTextareaProps } from './z-textarea.types';

export type { ZTextareaProps } from './z-textarea.types';

/**
 * Material-3 outlined field geometry (handoff UI kit), mirroring z-text-input.tsx:
 *   - min-h-14   → 56dp min height (M3 outlined text-field height); the field
 *                  still grows with content / `rows`-based `numberOfLines`.
 *   - rounded-xl → 12dp corner radius (M3 field radius).
 *   - bg-surface → surface fill behind the outline so the outlined look reads
 *                  on the warm background.
 *   - border-outline (default) / border-role-danger (invalid) → role tokens.
 * Accent focus is rendered with an inset ring so the border width never grows
 * (`focus:border-accent` swaps color only; `ring-inset` keeps it inside the box
 * → no layout shift). On native (iOS/Android) focus is handled by the OS widget;
 * this ring is the NativeWind web/jest contract only.
 */

/**
 * Multi-line text input — NativeWind fallback (web / Storybook / jest).
 *
 * Mobile counterpart of the web `z-textarea` wrapper
 * (web/dashboard-next/src/app/shared/ui/textarea/).
 *
 * On iOS this file is superseded by z-textarea.ios.tsx (SwiftUI TextField,
 * axis: vertical). On Android this file is superseded by z-textarea.android.tsx
 * (Compose OutlinedTextField, multiline). This bare fallback is the test
 * surface and Storybook entry point.
 */
export function ZTextarea({
  value,
  onChangeText,
  accessibilityLabel,
  placeholder = '',
  rows = 4,
  invalid = false,
  disabled = false,
  testID,
}: ZTextareaProps) {
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
      multiline
      numberOfLines={rows}
      textAlignVertical="top"
      className={`min-h-14 w-full rounded-xl border px-3 py-2 text-sm focus:border-accent focus:ring-1 focus:ring-inset focus:ring-accent ${
        disabled ? 'bg-surface-variant text-on-surface-variant' : 'bg-surface text-on-surface'
      } ${invalid ? 'border-role-danger' : 'border-outline'}`}
    />
  );
}
