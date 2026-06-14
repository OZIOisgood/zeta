/**
 * ZChip — iOS implementation (SwiftUI via @expo/ui/swift-ui).
 *
 * Renders a native SwiftUI bordered Button inside a Host wrapper.
 * Selection is expressed via tint: when selected, the accent color is applied
 * to the bordered button, giving a visually "selected" filled-tinted look.
 * When not selected, the outline tint (neutral border color) is used.
 *
 * SwiftUI mapping:
 *   - buttonStyle('bordered') — capsule-shaped bordered button (HIG filter chip)
 *   - controlSize('regular')
 *   - tint(accent) when selected; tint(outline) when unselected
 *   - disabled() modifier when disabled
 *
 * HIG reference: https://developer.apple.com/design/human-interface-guidelines/buttons
 *
 * @expo/ui version: ~56.0.17
 */

import { Button, Host } from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  accessibilityLabel,
  buttonStyle,
  controlSize,
  disabled,
  tint,
} from '@expo/ui/swift-ui/modifiers';

import { useRoleColors } from '../../theme/native';
import type { ZChipProps } from './z-chip.types';

export type { ZChipProps } from './z-chip.types';

export function ZChip({
  label,
  selected = false,
  onPress,
  disabled: isDisabled = false,
  testID,
}: ZChipProps) {
  const { color } = useRoleColors();

  const modifiers = [
    buttonStyle('bordered'),
    controlSize('regular'),
    // Selected → accent tint (fills border + text in accent color).
    // Unselected → outline tint (neutral bordered appearance).
    tint(selected ? color('accent') : color('outline')),
    disabled(isDisabled),
    accessibilityLabel(label),
    ...(testID ? [accessibilityIdentifier(testID)] : []),
  ];

  return (
    <Host matchContents>
      <Button onPress={onPress} label={label} modifiers={modifiers} />
    </Host>
  );
}
