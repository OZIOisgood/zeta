/**
 * ZChip — Android implementation (Jetpack Compose via @expo/ui/jetpack-compose).
 *
 * Renders a Material 3 FilterChip inside a Host wrapper (matchContents).
 *
 * FilterChip is the correct Material 3 component for selectable filter options
 * that can be toggled on/off (e.g. group picker, tag filters).
 * Reference: https://m3.material.io/components/chips/overview
 *
 * Selected state is passed directly via the `selected` prop. Accent colors from
 * role tokens are applied to the selectedContainerColor / selectedLabelColor so
 * the selected chip renders with the brand accent background.
 *
 * testID is forwarded via semantics modifier.
 * Colors from theme/native.ts role tokens (useRoleColors). No hardcoded hex.
 *
 * @expo/ui version: ~56.0.17
 */

import { FilterChip, Host, Text } from '@expo/ui/jetpack-compose';
import { testID as testIDModifier } from '@expo/ui/jetpack-compose/modifiers';

import { useRoleColors } from '../../theme/native';
import type { ZChipProps } from './z-chip.types';

export type { ZChipProps } from './z-chip.types';

export function ZChip({
  label,
  selected = false,
  onPress,
  disabled = false,
  testID,
}: ZChipProps) {
  const { color } = useRoleColors();
  const modifiers = testID ? [testIDModifier(testID)] : [];

  return (
    <Host matchContents>
      <FilterChip
        selected={selected}
        enabled={!disabled}
        onClick={onPress}
        colors={{
          containerColor: color('surface'),
          labelColor: color('onSurface'),
          selectedContainerColor: color('accentContainer'),
          selectedLabelColor: color('onAccentContainer'),
        }}
        modifiers={modifiers}
      >
        <FilterChip.Label>
          <Text color={selected ? color('onAccentContainer') : color('onSurface')}>{label}</Text>
        </FilterChip.Label>
      </FilterChip>
    </Host>
  );
}
