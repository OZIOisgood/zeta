/**
 * ZTextInput — Android implementation (Jetpack Compose OutlinedTextField via
 * @expo/ui/jetpack-compose).
 *
 * Renders a Material 3 OutlinedTextField inside a Host wrapper. The field is
 * controlled via an ObservableState that bridges the RN value prop into the
 * Compose layer.
 *
 * Public API ↔ Compose mapping:
 *   value / onChangeText    → value (ObservableState) / onValueChange; a useEffect
 *                             keeps the observable in sync when value changes externally
 *   placeholder             → OutlinedTextField.Label slot (floats above field)
 *   invalid                 → isError prop
 *   disabled                → enabled={false}
 *   autoCapitalize          → keyboardOptions.capitalization
 *   autoCorrect             → keyboardOptions.autoCorrectEnabled
 *   returnKeyType           → keyboardOptions.imeAction (best-effort mapping)
 *   onSubmitEditing         → keyboardActions.onDone / onGo / onSearch / onSend / onNext
 *   accessibilityLabel      → LIMITATION: @expo/ui ~56.0.17 does not expose a
 *                             contentDescription/semantics prop on OutlinedTextField
 *                             or Host. The `semantics` modifier only accepts
 *                             `contentType`, not `contentDescription`. The prop is
 *                             accepted and stored but cannot be forwarded to TalkBack
 *                             in this release. The floating Label text is the only
 *                             TalkBack-visible identifier for the field.
 *                             deviceValidation: verify TalkBack reads the Label text
 *                             on a real Android device; update when @expo/ui adds
 *                             contentDescription support.
 *   testID                  → testID modifier on Host
 *
 * Colors come exclusively from theme/native.ts role tokens via useRoleColors().
 * No hardcoded hex values.
 *
 * Controlled-value sync strategy (Android / Compose):
 *   Compose OutlinedTextField is driven by `value` (ObservableState<string>).
 *   When the user types, `onValueChange` fires and we call `onChangeText` so RN
 *   state updates. When the parent updates `value` (e.g. programmatic reset),
 *   a `useEffect` pushes the new value into the observable via `value.set(v)`.
 *   This is the same pattern used by z-select.android.tsx for displayLabel sync.
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
import type { ZTextInputProps } from './z-text-input.types';

export type { ZTextInputProps } from './z-text-input.types';

// Maps RN autoCapitalize to Compose TextFieldCapitalization.
type ComposeCapitalization = 'none' | 'characters' | 'words' | 'sentences';

function toComposeCapitalization(
  autoCapitalize: ZTextInputProps['autoCapitalize'],
): ComposeCapitalization {
  switch (autoCapitalize) {
    case 'characters':
      return 'characters';
    case 'words':
      return 'words';
    case 'sentences':
      return 'sentences';
    case 'none':
    default:
      return 'none';
  }
}

// Maps RN returnKeyType to Compose TextFieldImeAction.
type ComposeImeAction = 'default' | 'none' | 'go' | 'search' | 'send' | 'previous' | 'next' | 'done';

function toComposeImeAction(
  returnKeyType: ZTextInputProps['returnKeyType'],
): ComposeImeAction {
  switch (returnKeyType) {
    case 'done':
      return 'done';
    case 'go':
      return 'go';
    case 'next':
      return 'next';
    case 'previous':
      return 'previous';
    case 'search':
      return 'search';
    case 'send':
      return 'send';
    case 'none':
      return 'none';
    default:
      return 'default';
  }
}

export function ZTextInput({
  value,
  onChangeText,
  // accessibilityLabel: accepted by the public API but cannot be forwarded to
  // TalkBack — @expo/ui ~56.0.17 exposes no contentDescription path on
  // OutlinedTextField or Host. See header comment for details.
  accessibilityLabel: _accessibilityLabel,
  placeholder = '',
  invalid = false,
  disabled: isDisabled = false,
  testID,
  autoCapitalize,
  autoCorrect,
  returnKeyType,
  onSubmitEditing,
}: ZTextInputProps) {
  const { color } = useRoleColors();

  // ObservableState bridges the controlled RN value into the Compose layer.
  const nativeValue = useNativeState(value);

  // Keep the observable in sync when the parent changes value externally
  // (e.g. form reset, programmatic clear).
  useEffect(() => {
    nativeValue.set(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const imeAction = toComposeImeAction(returnKeyType);

  // Wire onSubmitEditing to the matching keyboardAction callback.
  const submitHandler = onSubmitEditing
    ? (text: string) => onSubmitEditing({ nativeEvent: { text } } as never)
    : undefined;

  const keyboardActions = submitHandler
    ? {
        onDone: imeAction === 'done' || imeAction === 'default' ? submitHandler : undefined,
        onGo: imeAction === 'go' ? submitHandler : undefined,
        onSearch: imeAction === 'search' ? submitHandler : undefined,
        onSend: imeAction === 'send' ? submitHandler : undefined,
        onNext: imeAction === 'next' ? submitHandler : undefined,
      }
    : undefined;

  const hostModifiers = testID ? [testIDModifier(testID)] : [];

  return (
    <Host matchContents style={{ alignSelf: 'stretch' }} modifiers={hostModifiers}>
      <OutlinedTextField
        value={nativeValue}
        enabled={!isDisabled}
        isError={invalid}
        singleLine
        onValueChange={(text) => {
          onChangeText(text);
        }}
        keyboardOptions={{
          capitalization: toComposeCapitalization(autoCapitalize),
          autoCorrectEnabled: autoCorrect !== false,
          imeAction,
        }}
        keyboardActions={keyboardActions}
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
