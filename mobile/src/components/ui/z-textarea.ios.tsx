/**
 * ZTextarea — iOS implementation (SwiftUI TextField, vertical axis, via
 * @expo/ui/swift-ui).
 *
 * Renders a native SwiftUI TextField with `axis='vertical'` so it grows
 * downward as the user types — the HIG-recommended multiline text input
 * pattern. A `lineLimit` modifier provides a sensible minimum height while
 * allowing the field to expand up to a maximum.
 *
 * Public API ↔ SwiftUI mapping:
 *   value / onChangeText → text (ObservableState) / onTextChange; useEffect
 *                          keeps the observable in sync with external value changes
 *   placeholder          → TextField placeholder prop
 *   rows                 → lineLimit({ min: rows, max: rows * 3 }) — sets minimum
 *                          visible rows while allowing up to 3× expansion
 *   invalid              → tint(danger)
 *   disabled             → disabled() modifier
 *   accessibilityLabel   → accessibilityLabel() modifier
 *   testID               → accessibilityIdentifier() modifier
 *
 * Colors come exclusively from theme/native.ts role tokens via useRoleColors().
 * No hardcoded hex values.
 *
 * Controlled-value sync strategy: identical to z-text-input.ios.tsx —
 * ObservableState driven by useNativeState(value), with a useEffect to push
 * externally changed values back into the observable.
 *
 * @expo/ui version: ~56.0.17
 * HIG reference: https://developer.apple.com/design/human-interface-guidelines/text-fields
 */

import { useEffect } from 'react';
import { Host, TextField, useNativeState } from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  accessibilityLabel,
  disabled,
  frame,
  lineLimit,
  tint,
} from '@expo/ui/swift-ui/modifiers';

import { useRoleColors } from '../../theme/native';
import type { ZTextareaProps } from './z-textarea.types';

export type { ZTextareaProps } from './z-textarea.types';

export function ZTextarea({
  value,
  onChangeText,
  accessibilityLabel: a11yLabel,
  placeholder = '',
  rows = 4,
  invalid = false,
  disabled: isDisabled = false,
  testID,
}: ZTextareaProps) {
  const { color } = useRoleColors();

  // ObservableState bridges the controlled RN value into the SwiftUI layer.
  const text = useNativeState(value);

  // Keep the observable in sync when the parent changes value externally.
  useEffect(() => {
    text.set(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const modifiers = [
    frame({ maxWidth: Infinity }),
    // Minimum rows = rows prop; allow expansion up to 3× (cap at 20 lines max).
    lineLimit({ min: rows, max: Math.min(rows * 3, 20) }),
    disabled(isDisabled),
    invalid ? tint(color('danger')) : tint(color('accent')),
    ...(a11yLabel ? [accessibilityLabel(a11yLabel)] : []),
    ...(testID ? [accessibilityIdentifier(testID)] : []),
  ];

  return (
    <Host matchContents style={{ alignSelf: 'stretch' }}>
      <TextField
        placeholder={placeholder}
        text={text}
        onTextChange={(newText) => {
          onChangeText(newText);
        }}
        axis="vertical"
        modifiers={modifiers}
      />
    </Host>
  );
}
