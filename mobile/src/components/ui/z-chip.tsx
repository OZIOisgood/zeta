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
 * No web counterpart yet; the visual language follows Zeta tokens. Selected
 * adopts the Material You "on" state: warm secondary-container fill + a leading
 * check (Material You handoff).
 */

import { Pressable, Text } from 'react-native';

import { ZSymbol } from './z-symbol';
import type { ZChipProps } from './z-chip.types';

export type { ZChipProps } from './z-chip.types';

export function ZChip({
  label,
  selected = false,
  onPress,
  disabled = false,
  showCheck = true,
  testID,
}: ZChipProps) {
  const showLeadingCheck = selected && showCheck;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`flex-row items-center gap-1.5 rounded-xl border px-3 py-1.5 ${
        selected
          ? 'border-secondary-container bg-secondary-container'
          : 'border-outline bg-surface'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      {showLeadingCheck ? (
        <ZSymbol
          name="check"
          label=""
          size={18}
          testID={testID ? `${testID}-check` : undefined}
        />
      ) : null}
      <Text
        className={`text-sm ${
          selected ? 'font-bold text-on-secondary-container' : 'font-medium text-on-surface'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
