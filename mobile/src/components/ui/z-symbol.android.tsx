/**
 * ZSymbol — Android implementation.
 *
 * Uses expo-symbols `SymbolView` with Material Symbols via dynamic font
 * loading. The `name` prop accepts an object shape `{ android: AndroidSymbol }`
 * to select the Material Symbol. expo-symbols loads the Material Symbols font
 * on demand and renders via a Text glyph.
 *
 * @expo/vector-icons is NOT a dependency of this project. expo-symbols ships
 * Material Symbols support for Android natively, so no additional packages are
 * needed.
 *
 * Color is read from theme/native.ts role tokens; default role is 'onSurface'.
 * Pass an explicit `color` hex to override (e.g. from tab bar tintColor).
 */

import type { AndroidSymbol } from 'expo-symbols';
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
      name={{ android: entry.android as AndroidSymbol }}
      size={size}
      tintColor={resolvedColor}
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
