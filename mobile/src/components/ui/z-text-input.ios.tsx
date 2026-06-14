/**
 * ZTextInput — iOS implementation (SwiftUI TextField via @expo/ui/swift-ui).
 *
 * Renders a native SwiftUI TextField inside a Host wrapper that stretches to
 * full width. The field is controlled via an ObservableState that bridges the
 * RN value prop into the SwiftUI layer.
 *
 * Public API ↔ SwiftUI mapping:
 *   value / onChangeText    → text (ObservableState) / onTextChange; a useEffect
 *                             keeps the observable in sync when value changes externally
 *   placeholder             → TextField placeholder prop (shown when field is empty)
 *   invalid                 → tint(danger) on the field
 *   disabled                → disabled() modifier
 *   autoCapitalize          → textInputAutocapitalization() modifier
 *   autoCorrect             → autocorrectionDisabled() modifier
 *   returnKeyType           → submitLabel() modifier (best-effort mapping)
 *   onSubmitEditing         → onSubmit() modifier
 *   accessibilityLabel      → accessibilityLabel() modifier
 *   testID                  → accessibilityIdentifier() modifier
 *
 * Colors come exclusively from theme/native.ts role tokens via useRoleColors().
 * No hardcoded hex values.
 *
 * Controlled-value sync strategy (iOS / SwiftUI):
 *   SwiftUI TextField is driven by `text` (ObservableState<string>). When the
 *   user types, `onTextChange` fires and we call `onChangeText` so RN state
 *   updates. When the parent updates `value` (e.g. programmatic reset),
 *   a `useEffect` pushes the new value into the observable via `text.set(value)`.
 *   This is the same pattern used by z-select.ios.tsx for display sync.
 *
 * @expo/ui version: ~56.0.17
 * HIG reference: https://developer.apple.com/design/human-interface-guidelines/text-fields
 */

import { useEffect } from 'react';
import { Host, TextField, useNativeState } from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  accessibilityLabel,
  autocorrectionDisabled,
  disabled,
  frame,
  onSubmit,
  submitLabel,
  textInputAutocapitalization,
  tint,
} from '@expo/ui/swift-ui/modifiers';

import { useRoleColors } from '../../theme/native';
import type { ZTextInputProps } from './z-text-input.types';

export type { ZTextInputProps } from './z-text-input.types';

// Maps RN returnKeyType values to SwiftUI submitLabel equivalents.
// Values that have no direct SwiftUI counterpart default to 'return'.
type SwiftUISubmitLabel =
  | 'continue'
  | 'done'
  | 'go'
  | 'join'
  | 'next'
  | 'return'
  | 'route'
  | 'search'
  | 'send';

function toSubmitLabel(
  returnKeyType: ZTextInputProps['returnKeyType'],
): SwiftUISubmitLabel | undefined {
  switch (returnKeyType) {
    case 'done':
      return 'done';
    case 'go':
      return 'go';
    case 'join':
      return 'join';
    case 'next':
      return 'next';
    case 'route':
      return 'route';
    case 'search':
      return 'search';
    case 'send':
      return 'send';
    case 'default':
      return 'return';
    case 'none':
    case 'previous':
    case 'google':
    case 'yahoo':
    case 'emergency-call':
      return undefined;
    default:
      return undefined;
  }
}

// Maps RN autoCapitalize values to SwiftUI textInputAutocapitalization values.
type SwiftUIAutocapitalization = 'never' | 'words' | 'sentences' | 'characters';

function toAutocapitalization(
  autoCapitalize: ZTextInputProps['autoCapitalize'],
): SwiftUIAutocapitalization | undefined {
  switch (autoCapitalize) {
    case 'none':
      return 'never';
    case 'words':
      return 'words';
    case 'sentences':
      return 'sentences';
    case 'characters':
      return 'characters';
    default:
      return undefined;
  }
}

export function ZTextInput({
  value,
  onChangeText,
  accessibilityLabel: a11yLabel,
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

  // ObservableState bridges the controlled RN value into the SwiftUI layer.
  const text = useNativeState(value);

  // Keep the observable in sync when the parent changes value externally
  // (e.g. form reset, programmatic clear).
  useEffect(() => {
    text.set(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const mappedSubmitLabel = toSubmitLabel(returnKeyType);
  const mappedAutocapitalization = toAutocapitalization(autoCapitalize);

  const modifiers = [
    frame({ maxWidth: Infinity }),
    disabled(isDisabled),
    invalid ? tint(color('danger')) : tint(color('accent')),
    ...(a11yLabel ? [accessibilityLabel(a11yLabel)] : []),
    ...(testID ? [accessibilityIdentifier(testID)] : []),
    // autoCorrect=false → disable autocorrection; true/undefined → leave default
    ...(autoCorrect === false ? [autocorrectionDisabled(true)] : []),
    ...(autoCorrect === true ? [autocorrectionDisabled(false)] : []),
    ...(mappedAutocapitalization ? [textInputAutocapitalization(mappedAutocapitalization)] : []),
    ...(mappedSubmitLabel ? [submitLabel(mappedSubmitLabel)] : []),
    ...(onSubmitEditing
      ? [onSubmit(() => onSubmitEditing({ nativeEvent: { text: value } } as never))]
      : []),
  ];

  return (
    <Host matchContents style={{ alignSelf: 'stretch' }}>
      <TextField
        placeholder={placeholder}
        text={text}
        onTextChange={(newText) => {
          onChangeText(newText);
        }}
        axis="horizontal"
        modifiers={modifiers}
      />
    </Host>
  );
}
