/**
 * ZSelect — iOS implementation (SwiftUI Picker via @expo/ui/swift-ui).
 *
 * Renders a native SwiftUI Picker with `pickerStyle('menu')` inside a Host
 * wrapper that auto-sizes to content (`matchContents`). The menu style presents
 * a compact trigger that opens an inline dropdown menu — the HIG-recommended
 * pattern for in-form single-choice selection.
 *
 * Public API ↔ SwiftUI mapping:
 *   value / onValueChange  → selection (string tag) / onSelectionChange
 *   options[]              → children: Text nodes each with a tag(value) modifier
 *   placeholder            → shown as the label prop when no value is selected
 *   invalid                → tint(danger) on the Picker
 *   disabled               → disabled() modifier
 *   accessibilityLabel     → accessibilityLabel() modifier
 *   testID                 → accessibilityIdentifier() modifier
 *
 * Colors come exclusively from theme/native.ts role tokens via useRoleColors().
 * No hardcoded hex values.
 *
 * Notes:
 *   - The Picker `selection` prop accepts the tag value of the selected child.
 *     We pass `value ?? ''` so when no value is set the picker selection is
 *     an empty string, which matches no child tag and shows the label/placeholder.
 *   - SwiftUI Picker with `pickerStyle('menu')` natively shows the current
 *     selection in the trigger label area. When `selection` is '' (no match),
 *     the label prop text (placeholder) is displayed.
 *   - The `label` prop can be a string or ReactNode; we pass the placeholder
 *     text so it doubles as both the field label and the empty-state indicator.
 *   - `tint` colors the entire picker in the given color, including the trigger
 *     chevron and selected label — appropriate for the `invalid` state (danger).
 *
 * @expo/ui version: ~56.0.17
 * HIG reference: https://developer.apple.com/design/human-interface-guidelines/pickers
 */

import { Host, Picker, Text } from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  accessibilityLabel,
  disabled,
  pickerStyle,
  tag,
  tint,
} from '@expo/ui/swift-ui/modifiers';

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
  accessibilityLabel: a11yLabel,
  testID,
}: ZSelectProps) {
  const { color } = useRoleColors();

  // Map the current value to the SwiftUI selection (tag). When no value is set,
  // use an empty string — no child will have this tag so the placeholder label shows.
  const selection = value ?? '';

  const modifiers = [
    pickerStyle('menu'),
    disabled(isDisabled),
    ...(invalid ? [tint(color('danger'))] : [tint(color('accent'))]),
    ...(a11yLabel ? [accessibilityLabel(a11yLabel)] : []),
    ...(testID ? [accessibilityIdentifier(testID)] : []),
  ];

  return (
    <Host matchContents>
      <Picker<string>
        label={placeholder}
        selection={selection}
        onSelectionChange={(selected) => {
          // Only fire if the selected value actually maps to a known option.
          const match = options.find((o) => o.value === selected);
          if (match) {
            onValueChange(match.value);
          }
        }}
        modifiers={modifiers}
      >
        {options.map((option) => (
          <Text key={option.value} modifiers={[tag(option.value)]}>
            {option.label}
          </Text>
        ))}
      </Picker>
    </Host>
  );
}
