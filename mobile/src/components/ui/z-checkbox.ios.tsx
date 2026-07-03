/**
 * ZCheckbox — iOS implementation (SwiftUI Toggle via @expo/ui/swift-ui).
 *
 * On iOS a boolean toggle in a settings/form context maps to SwiftUI Toggle
 * (rendered as a UISwitch), per HIG:
 * https://developer.apple.com/design/human-interface-guidelines/toggles
 *
 * A checkbox box is not a native iOS control; the Switch is the HIG-correct
 * equivalent for "enable/disable a setting" semantics.
 *
 * Public API ↔ SwiftUI mapping:
 *   value / onValueChange → isOn (ObservableState) / onIsOnChangeSync
 *                           useEffect keeps the observable in sync when value
 *                           changes externally (same pattern as ZTextInput iOS)
 *   label                 → Toggle label prop (built-in trailing text on iOS)
 *   disabled              → disabled() modifier
 *   testID                → accessibilityIdentifier() modifier
 *   labelClassName        → ignored on iOS (label styled by system theme)
 *
 * Colors come exclusively from theme/native.ts role tokens via useRoleColors().
 * The accent tint is applied to the Switch track when checked.
 * No hardcoded hex values.
 *
 * Controlled-value sync strategy:
 *   SwiftUI SyncToggle is driven by `isOn` (ObservableState<boolean>). When the
 *   user taps, `onIsOnChangeSync` fires and we call `onValueChange` so RN state
 *   updates. When the parent updates `value` (e.g. form reset), a `useEffect`
 *   pushes the new value into the observable via `isOn.set(value)`.
 *
 * @expo/ui version: ~56.0.17
 * HIG reference: https://developer.apple.com/design/human-interface-guidelines/toggles
 */

import { useEffect } from 'react';
import { Host, SyncToggle, useNativeState } from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  disabled,
  tint,
} from '@expo/ui/swift-ui/modifiers';

import { useRoleColors } from '../../theme/native';
import type { ZCheckboxProps } from './z-checkbox.types';

export type { ZCheckboxProps } from './z-checkbox.types';

export function ZCheckbox({
  value,
  onValueChange,
  label,
  disabled: isDisabled = false,
  testID,
  // labelClassName intentionally unused on iOS — system theme controls label style
}: ZCheckboxProps) {
  const { color } = useRoleColors();

  // ObservableState bridges the controlled RN value into the SwiftUI layer.
  const isOn = useNativeState(value);

  // Keep the observable in sync when the parent changes value externally
  // (e.g. form reset, programmatic toggle from parent state).
  useEffect(() => {
    isOn.set(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const modifiers = [
    disabled(isDisabled),
    tint(color('accent')),
    ...(testID ? [accessibilityIdentifier(testID)] : []),
  ];

  return (
    <Host matchContents>
      <SyncToggle
        isOn={isOn}
        label={label ?? ''}
        onIsOnChangeSync={(next) => {
          'worklet';
          onValueChange(next);
        }}
        modifiers={modifiers}
      />
    </Host>
  );
}
