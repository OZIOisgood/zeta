import {
  ExtendedFloatingActionButton,
  FloatingActionButton,
  Host,
  Text,
} from '@expo/ui/jetpack-compose';
import { testID as testIDModifier } from '@expo/ui/jetpack-compose/modifiers';
import { View } from 'react-native';
import { useRoleColors } from '../../theme/native';
import type { ZFabProps } from './z-fab.types';

export type { ZFabProps } from './z-fab.types';

/**
 * Android: Material 3 ExtendedFloatingActionButton (icon + label) or round
 * FloatingActionButton when extended=false. `tone` selects the emphasis:
 *   - primary → accentStrong fill + onAccent content (high-emphasis, default)
 *   - tonal   → accentContainer fill + onAccentContainer content (lower-emphasis)
 * Outer NativeWind View forwards className/style for positioning.
 *
 * M3 shape/elevation note: the collapsed FAB should be a 16dp rounded-square
 * with a ~6dp resting elevation. The @expo/ui FloatingActionButtonProps surface
 * (children/containerColor/onClick/modifiers) does NOT expose `shape`,
 * `cornerRadius`, or `elevation`, so we cannot set them explicitly — we rely on
 * the underlying Jetpack Compose M3 FloatingActionButton defaults, which already
 * apply the 16dp rounded-square shape and the standard resting elevation.
 */
export function ZFab({
  label,
  icon,
  onPress,
  extended = true,
  tone = 'primary',
  className,
  style,
  testID,
}: ZFabProps) {
  const { color } = useRoleColors();
  const modifiers = testID ? [testIDModifier(testID)] : [];
  const containerColor = tone === 'primary' ? color('accentStrong') : color('accentContainer');
  const contentColor = tone === 'primary' ? color('onAccent') : color('onAccentContainer');

  if (!extended) {
    return (
      <View className={className} style={style}>
        <Host matchContents>
          <FloatingActionButton onClick={onPress} containerColor={containerColor} modifiers={modifiers}>
            <FloatingActionButton.Icon>
              <View accessibilityLabel={label}>{icon}</View>
            </FloatingActionButton.Icon>
          </FloatingActionButton>
        </Host>
      </View>
    );
  }

  return (
    <View className={className} style={style}>
      <Host matchContents>
        <ExtendedFloatingActionButton
          expanded
          onClick={onPress}
          containerColor={containerColor}
          modifiers={modifiers}
        >
          <ExtendedFloatingActionButton.Icon>
            <View accessibilityLabel={label}>{icon}</View>
          </ExtendedFloatingActionButton.Icon>
          <ExtendedFloatingActionButton.Text>
            <Text color={contentColor}>{label}</Text>
          </ExtendedFloatingActionButton.Text>
        </ExtendedFloatingActionButton>
      </Host>
    </View>
  );
}
