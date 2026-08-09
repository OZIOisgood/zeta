import { Host, LinearProgressIndicator } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, testID as testIDModifier } from '@expo/ui/jetpack-compose/modifiers';
import { useColorScheme, View } from 'react-native';
import { useRoleColors } from '../../theme/native';
import type { ZProgressProps } from './z-progress.types';

export type { ZProgressProps } from './z-progress.types';

/**
 * Intentional system-neutral chrome for the progress track. There is no neutral
 * role token (roles are warm-tinted), and the M3 default track derives from the
 * warm `surfaceVariant`, so we pass an explicit neutral gray here instead — a
 * light gray rail in light mode, a dark gray rail in dark mode (Tailwind
 * neutral-300 / neutral-700). The accent fill comes from the role token.
 */
const NEUTRAL_TRACK = { light: '#d4d4d4', dark: '#404040' } as const;

/**
 * Android: Material 3 LinearProgressIndicator. `fillMaxWidth()` makes the bar
 * span the row (Compose default is ~240dp). Outer NativeWind View forwards
 * `className` (the Host does not honor NativeWind classes reliably).
 */
export function ZProgress({ value, className, testID }: ZProgressProps) {
  const { color } = useRoleColors();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View className={className} testID={testID}>
      <Host matchContents={{ vertical: true }}>
        <LinearProgressIndicator
          progress={clamped}
          color={color('accent')}
          trackColor={NEUTRAL_TRACK[scheme]}
          modifiers={[fillMaxWidth(), ...(testID ? [testIDModifier(testID)] : [])]}
        />
      </Host>
    </View>
  );
}
