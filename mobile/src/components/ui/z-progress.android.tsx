import { Host, LinearProgressIndicator } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, testID as testIDModifier } from '@expo/ui/jetpack-compose/modifiers';
import { View } from 'react-native';
import { useRoleColors } from '../../theme/native';
import type { ZProgressProps } from './z-progress.types';

export type { ZProgressProps } from './z-progress.types';

/**
 * Android: Material 3 LinearProgressIndicator. `fillMaxWidth()` makes the bar
 * span the row (Compose default is ~240dp). Outer NativeWind View forwards
 * `className` (the Host does not honor NativeWind classes reliably).
 */
export function ZProgress({ value, className, testID }: ZProgressProps) {
  const { color } = useRoleColors();
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View className={className} testID={testID}>
      <Host matchContents={{ vertical: true }}>
        <LinearProgressIndicator
          progress={clamped}
          color={color('accent')}
          trackColor={color('outline')}
          modifiers={[fillMaxWidth(), ...(testID ? [testIDModifier(testID)] : [])]}
        />
      </Host>
    </View>
  );
}
