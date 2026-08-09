/**
 * ZSymbol — bare fallback (web / Storybook / jest).
 *
 * Renders the lucide icon component with an accessibilityLabel so the element
 * is discoverable by screen readers and RNTL's getByLabelText.
 *
 * Platform-specific implementations:
 *   .ios.tsx    → expo-symbols SymbolView with SF Symbols
 *   .android.tsx → expo-symbols SymbolView with Material Symbols
 */

import { View } from 'react-native';

import { useRoleColors } from '../../theme/native';
import { SYMBOL_MAP } from './z-symbol.map';
import type { ZSymbolProps } from './z-symbol.types';

export function ZSymbol({ name, label, size = 24, color, testID }: ZSymbolProps) {
  const { color: roleColor } = useRoleColors();
  const entry = SYMBOL_MAP[name];
  const Icon = entry.lucide;
  const resolvedColor = color ?? roleColor('onSurface');
  return (
    <View
      accessible
      accessibilityLabel={label}
      testID={testID}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon size={size} color={resolvedColor} aria-hidden />
    </View>
  );
}
