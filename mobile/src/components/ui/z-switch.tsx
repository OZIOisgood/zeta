import { Switch, View } from 'react-native';

import { useRoleColors } from '../../theme/native';
import type { ZSwitchProps } from './z-switch.types';

export type { ZSwitchProps } from './z-switch.types';

/**
 * ZSwitch — settings toggle wrapping React Native's core `Switch`.
 *
 * RN `Switch` is the platform-native control on both targets (UISwitch on iOS,
 * Material 3 Switch on Android), so a single shared implementation is both the
 * simplest and the genuinely-native choice — no .ios/.android split required.
 *
 * Themed exclusively through role tokens (useRoleColors):
 *   - accent  → on-track color
 *   - outline → off-track color (neutral) + ios_backgroundColor
 *   - onAccent → thumb (white)
 *
 * Used as the trailing control of a settings ListItem. Controlled API
 * (`checked` + `onChange`), mirroring ZCheckbox's controlled value handling.
 */
export function ZSwitch({
  checked,
  onChange,
  disabled = false,
  accessibilityLabel,
  className,
  style,
  testID,
}: ZSwitchProps) {
  const { color } = useRoleColors();

  return (
    <View className={className}>
      <Switch
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled, checked }}
        value={checked}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ true: color('accent'), false: color('outline') }}
        thumbColor={color('onAccent')}
        ios_backgroundColor={color('outline')}
        style={style}
      />
    </View>
  );
}
