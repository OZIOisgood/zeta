/**
 * ZTextarea — Android implementation (Jetpack Compose OutlinedTextField,
 * multiline, via @expo/ui/jetpack-compose).
 *
 * Renders a Material 3 OutlinedTextField configured for multiline input.
 * `minLines` sets the minimum visible height (driven by the `rows` prop);
 * the field expands naturally as the user types.
 *
 * Public API ↔ Compose mapping:
 *   value / onChangeText → value (ObservableState) / onValueChange; useEffect
 *                          keeps the observable in sync with external value changes
 *   placeholder          → OutlinedTextField.Label slot (floats above field)
 *   rows                 → minLines prop (minimum visible text rows)
 *   invalid              → isError prop
 *   disabled             → enabled={false}
 *   accessibilityLabel   → LIMITATION: @expo/ui ~56.0.17 does not expose a
 *                          contentDescription/semantics prop on OutlinedTextField
 *                          or Host. The `semantics` modifier only accepts
 *                          `contentType`, not `contentDescription`. The prop is
 *                          accepted but cannot be forwarded to TalkBack in this
 *                          release. The floating Label text is the only
 *                          TalkBack-visible identifier for the field.
 *                          deviceValidation: verify TalkBack reads the Label text
 *                          on a real Android device; update when @expo/ui adds
 *                          contentDescription support.
 *   testID               → testID modifier on Host
 *
 * Colors come exclusively from theme/native.ts role tokens via useRoleColors().
 * No hardcoded hex values.
 *
 * Controlled-value sync strategy: identical to z-text-input.android.tsx —
 * ObservableState driven by useNativeState(value), with a useEffect to push
 * externally changed values back into the observable.
 *
 * @expo/ui version: ~56.0.17
 * Material 3 reference: https://m3.material.io/components/text-fields/overview
 */

import { useEffect } from 'react';
import { Host, OutlinedTextField, Text, useNativeState } from '@expo/ui/jetpack-compose';
import {
  fillMaxWidth,
  testID as testIDModifier,
} from '@expo/ui/jetpack-compose/modifiers';

import { useRoleColors } from '../../theme/native';
import type { ZTextareaProps } from './z-textarea.types';

export type { ZTextareaProps } from './z-textarea.types';

export function ZTextarea({
  value,
  onChangeText,
  // accessibilityLabel: accepted by the public API but cannot be forwarded to
  // TalkBack — @expo/ui ~56.0.17 exposes no contentDescription path on
  // OutlinedTextField or Host. See header comment for details.
  accessibilityLabel: _accessibilityLabel,
  placeholder = '',
  rows = 4,
  invalid = false,
  disabled: isDisabled = false,
  testID,
}: ZTextareaProps) {
  const { color } = useRoleColors();

  // ObservableState bridges the controlled RN value into the Compose layer.
  const nativeValue = useNativeState(value);

  // Keep the observable in sync when the parent changes value externally.
  useEffect(() => {
    nativeValue.set(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const hostModifiers = testID ? [testIDModifier(testID)] : [];

  return (
    <Host matchContents style={{ alignSelf: 'stretch' }} modifiers={hostModifiers}>
      <OutlinedTextField
        value={nativeValue}
        enabled={!isDisabled}
        isError={invalid}
        // multiline: singleLine=false (default) + minLines drives minimum height
        singleLine={false}
        minLines={rows}
        onValueChange={(text) => {
          onChangeText(text);
        }}
        modifiers={[fillMaxWidth()]}
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
      </OutlinedTextField>
    </Host>
  );
}
