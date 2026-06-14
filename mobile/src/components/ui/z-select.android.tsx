/**
 * ZSelect — Android implementation (Jetpack Compose via @expo/ui/jetpack-compose).
 *
 * Renders a Material 3 ExposedDropdownMenuBox — the canonical Material 3
 * single-choice picker pattern — inside a Host wrapper.
 *
 * Public API ↔ Compose mapping:
 *   value / onValueChange  → selectedIndex ↔ options array; onExpandedChange +
 *                            DropdownMenuItem.onClick dispatches onValueChange
 *   options[]              → DropdownMenuItem children
 *   placeholder            → OutlinedTextField label slot (floats above field)
 *   invalid                → OutlinedTextField isError prop
 *   disabled               → ExposedDropdownMenuBox onExpandedChange guard +
 *                            OutlinedTextField enabled={false}
 *   accessibilityLabel     → semantics modifier on the Host or OutlinedTextField
 *   testID                 → testID modifier on Host
 *
 * Colors come exclusively from theme/native.ts role tokens via useRoleColors().
 * No hardcoded hex values.
 *
 * Architecture notes:
 *   - `OutlinedTextField` (readOnly, menuAnchor modifier) is used as the
 *     clickable anchor that opens the dropdown, matching the canonical
 *     Material 3 ExposedDropdownMenuBox pattern from the @expo/ui docs.
 *   - The anchor field's text is driven by a `useNativeState` observable that
 *     mirrors the current selected label (or empty string for placeholder).
 *     Because the field is readOnly, no edit events fire back.
 *   - `useEffect` syncs the observable whenever `value` or `options` change.
 *   - `ExposedDropdownMenu` + `DropdownMenuItem` render the option list.
 *   - Host `matchContents` sizes the Compose view to its intrinsic content size
 *     so it fits naturally in RN layout.
 *
 * @expo/ui version: ~56.0.17
 * Material 3 reference: https://m3.material.io/components/menus/overview#exposed-dropdown-menu
 */

import { useEffect, useState } from 'react';
import {
  DropdownMenuItem,
  ExposedDropdownMenu,
  ExposedDropdownMenuBox,
  Host,
  OutlinedTextField,
  Text,
  useNativeState,
} from '@expo/ui/jetpack-compose';
import {
  fillMaxWidth,
  menuAnchor,
  testID as testIDModifier,
} from '@expo/ui/jetpack-compose/modifiers';

import { useRoleColors } from '../../theme/native';
import type { ZSelectProps } from './z-select.types';

export type { ZSelectOption, ZSelectProps } from './z-select.types';

export function ZSelect({
  value,
  options,
  placeholder = '',
  onValueChange,
  invalid = false,
  disabled: isDisabled = false,
  accessibilityLabel,
  testID,
}: ZSelectProps) {
  const { color } = useRoleColors();
  const [expanded, setExpanded] = useState(false);

  // The display text shown in the anchor field.
  const displayLabel = options.find((o) => o.value === value)?.label ?? '';
  const displayState = useNativeState(displayLabel);

  // Keep the observable in sync whenever value or options change.
  useEffect(() => {
    const label = options.find((o) => o.value === value)?.label ?? '';
    displayState.set(label);
  }, [value, options, displayState]);

  const hostModifiers = testID ? [testIDModifier(testID)] : [];

  return (
    <Host matchContents style={{ alignSelf: 'stretch' }} modifiers={hostModifiers}>
      <ExposedDropdownMenuBox
        expanded={expanded && !isDisabled}
        onExpandedChange={(next) => {
          if (!isDisabled) setExpanded(next);
        }}
        modifiers={[fillMaxWidth()]}
      >
        <OutlinedTextField
          value={displayState}
          readOnly
          enabled={!isDisabled}
          isError={invalid}
          modifiers={[menuAnchor(), fillMaxWidth()]}
          colors={{
            focusedIndicatorColor: color('accent'),
            unfocusedIndicatorColor: color('outline'),
            errorIndicatorColor: color('danger'),
            errorLabelColor: color('danger'),
            errorTextColor: color('onSurface'),
            focusedTextColor: color('onSurface'),
            unfocusedTextColor: color('onSurface'),
            disabledTextColor: color('onSurfaceVariant'),
            focusedContainerColor: 'transparent',
            unfocusedContainerColor: 'transparent',
            disabledContainerColor: 'transparent',
            errorContainerColor: 'transparent',
          }}
        >
          {placeholder ? (
            <OutlinedTextField.Label>
              <Text>{placeholder}</Text>
            </OutlinedTextField.Label>
          ) : null}
          {accessibilityLabel ? (
            <OutlinedTextField.Placeholder>
              <Text color={color('onSurfaceVariant')}>{accessibilityLabel}</Text>
            </OutlinedTextField.Placeholder>
          ) : null}
        </OutlinedTextField>

        <ExposedDropdownMenu
          expanded={expanded && !isDisabled}
          onDismissRequest={() => setExpanded(false)}
          containerColor={color('surface')}
        >
          {options.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => {
                onValueChange(option.value);
                setExpanded(false);
              }}
            >
              <DropdownMenuItem.Text>
                <Text color={color('onSurface')}>{option.label}</Text>
              </DropdownMenuItem.Text>
            </DropdownMenuItem>
          ))}
        </ExposedDropdownMenu>
      </ExposedDropdownMenuBox>
    </Host>
  );
}
