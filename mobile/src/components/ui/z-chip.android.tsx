/**
 * ZChip — Android implementation (Jetpack Compose via @expo/ui/jetpack-compose).
 *
 * Renders a Material 3 FilterChip inside a Host wrapper (matchContents).
 *
 * FilterChip is the correct Material 3 component for selectable filter options
 * that can be toggled on/off (e.g. group picker, tag filters).
 * Reference: https://m3.material.io/components/chips/overview
 *
 * Selected state is passed directly via the `selected` prop. The Material You
 * "on" state uses the warm secondary-container fill + on-secondary-container
 * content, plus a LEADING CHECK supplied via the FilterChip.LeadingIcon slot
 * (Compose's M3 FilterChip does not auto-render a checkmark — the leadingIcon
 * slot is rendered verbatim, so we wire it ourselves, gated by `showCheck`).
 *
 * testID is forwarded via semantics modifier.
 * Colors from theme/native.ts role tokens (useRoleColors). No hardcoded hex.
 *
 * @expo/ui version: ~56.0.17
 */

import { FilterChip, Host, Text } from '@expo/ui/jetpack-compose';
import { testID as testIDModifier } from '@expo/ui/jetpack-compose/modifiers';

import { useRoleColors } from '../../theme/native';
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
  const { color } = useRoleColors();
  const modifiers = testID ? [testIDModifier(testID)] : [];
  const showLeadingCheck = selected && showCheck;

  return (
    <Host matchContents>
      <FilterChip
        selected={selected}
        enabled={!disabled}
        onClick={onPress}
        colors={{
          containerColor: color('surface'),
          labelColor: color('onSurface'),
          // Material You "on" state: warm secondary-container fill with
          // on-secondary-container content (label + leading check).
          selectedContainerColor: color('secondaryContainer'),
          selectedLabelColor: color('onSecondaryContainer'),
          selectedLeadingIconColor: color('onSecondaryContainer'),
        }}
        modifiers={modifiers}
      >
        {showLeadingCheck ? (
          <FilterChip.LeadingIcon>
            <ZSymbol
              name="check"
              label=""
              size={18}
              color={color('onSecondaryContainer')}
              testID={testID ? `${testID}-check` : undefined}
            />
          </FilterChip.LeadingIcon>
        ) : null}
        <FilterChip.Label>
          <Text
            color={selected ? color('onSecondaryContainer') : color('onSurface')}
            style={{ fontWeight: selected ? '700' : '500' }}
          >
            {label}
          </Text>
        </FilterChip.Label>
      </FilterChip>
    </Host>
  );
}
