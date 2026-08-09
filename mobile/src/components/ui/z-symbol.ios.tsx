/**
 * ZSymbol — iOS implementation.
 *
 * Uses expo-symbols `SymbolView` with SF Symbol names for native iconography.
 * Falls back to the lucide icon (via the `fallback` prop on SymbolView) in
 * the rare case the symbol is not available on the current OS version.
 *
 * Color is read from theme/native.ts role tokens; default role is 'onSurface'.
 * Pass an explicit `color` hex to override (e.g. from tab bar tintColor).
 */

import { SymbolView } from 'expo-symbols';
import { View } from 'react-native';

import { useRoleColors } from '../../theme/native';
import { SYMBOL_MAP } from './z-symbol.map';
import type { ZSymbolProps } from './z-symbol.types';

export function ZSymbol({ name, label, size = 24, color, testID }: ZSymbolProps) {
  const { color: roleColor } = useRoleColors();
  const entry = SYMBOL_MAP[name];
  const resolvedColor = color ?? roleColor('onSurface');
  const Icon = entry.lucide;

  return (
    <SymbolView
      name={entry.sf as Parameters<typeof SymbolView>[0]['name']}
      size={size}
      tintColor={resolvedColor}
      type="monochrome"
      accessibilityLabel={label}
      testID={testID}
      fallback={
        <View
          accessible
          accessibilityLabel={label}
          style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon size={size} color={resolvedColor} />
        </View>
      }
    />
  );
}
