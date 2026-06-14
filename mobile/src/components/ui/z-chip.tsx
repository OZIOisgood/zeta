/**
 * ZChip — NativeWind fallback (web / Storybook / jest).
 *
 * This file is the public contract and test surface for ZChip. It renders
 * correctly in react-native-web-vite Storybook and passes jest via RNTL.
 *
 * Native internals live in:
 *   - z-chip.ios.tsx     (SwiftUI bordered Button via @expo/ui/swift-ui)
 *   - z-chip.android.tsx (Jetpack Compose FilterChip via @expo/ui/jetpack-compose)
 *
 * DO NOT add @expo/ui imports here — this file must work in the web/Storybook
 * environment where native modules are unavailable.
 *
 * Selectable pill for single-choice option rows (group picker, video parts).
 * No web counterpart yet; the visual language follows Zeta tokens.
 */

import { Pressable, Text } from 'react-native';
import type { ZChipProps } from './z-chip.types';

export type { ZChipProps } from './z-chip.types';

export function ZChip({
  label,
  selected = false,
  onPress,
  disabled = false,
  testID,
}: ZChipProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`rounded-full border px-3 py-1.5 ${
        selected ? 'border-accent bg-accent-container' : 'border-outline bg-surface'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <Text className={`text-sm font-medium ${selected ? 'text-on-accent-container' : 'text-on-surface'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
