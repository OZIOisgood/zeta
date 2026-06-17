/**
 * ZCheckbox — Android implementation (Jetpack Compose Checkbox via
 * @expo/ui/jetpack-compose).
 *
 * Renders a Material 3 Checkbox inside a Host wrapper. When a label is
 * supplied, a Row wraps the Checkbox and a Text node side by side, matching
 * the canonical M3 checkbox-with-label layout.
 *
 * Public API ↔ Compose mapping:
 *   value / onValueChange → value / onCheckedChange (both boolean)
 *   disabled              → enabled={false}
 *   label                 → Text sibling in a Row (Checkbox has no built-in label slot)
 *   testID                → testID modifier on Host
 *   labelClassName        → ignored on Android (label styled by system theme)
 *
 * Colors come exclusively from theme/native.ts role tokens via useRoleColors().
 * accent role → checkedColor (filled state); outline role → uncheckedColor (border).
 * No hardcoded hex values.
 *
 * @expo/ui version: ~56.0.17
 * Material 3 reference: https://m3.material.io/components/checkbox/overview
 */

import { Checkbox, Host, Row, Text } from '@expo/ui/jetpack-compose';
import { testID as testIDModifier } from '@expo/ui/jetpack-compose/modifiers';

import { useRoleColors } from '../../theme/native';
import type { ZCheckboxProps } from './z-checkbox.types';

export type { ZCheckboxProps } from './z-checkbox.types';

export function ZCheckbox({
  value,
  onValueChange,
  label,
  disabled: isDisabled = false,
  testID,
  // labelClassName intentionally unused on Android — label styled by system theme
}: ZCheckboxProps) {
  const { color } = useRoleColors();

  const hostModifiers = testID ? [testIDModifier(testID)] : [];

  const checkbox = (
    <Checkbox
      value={value}
      enabled={!isDisabled}
      onCheckedChange={(next) => {
        onValueChange(next);
      }}
      colors={{
        checkedColor: color('accent'),
        uncheckedColor: color('outline'),
        checkmarkColor: color('onAccent'),
        disabledCheckedColor: color('onSurfaceVariant'),
        disabledUncheckedColor: color('onSurfaceVariant'),
      }}
    />
  );

  return (
    <Host matchContents modifiers={hostModifiers}>
      {label ? (
        <Row verticalAlignment="center">
          {checkbox}
          <Text color={isDisabled ? color('onSurfaceVariant') : color('onSurface')} style={{ fontFamily: 'NunitoSans_400Regular' }}>{label}</Text>
        </Row>
      ) : (
        checkbox
      )}
    </Host>
  );
}
