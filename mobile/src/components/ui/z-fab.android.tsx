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
 * FloatingActionButton when extended=false. Filled-accent (accentStrong fill +
 * white onAccent content) — same treatment as the current round FAB, with a
 * label. Outer NativeWind View forwards className/style for positioning.
 */
export function ZFab({ label, icon, onPress, extended = true, className, style, testID }: ZFabProps) {
  const { color } = useRoleColors();
  const modifiers = testID ? [testIDModifier(testID)] : [];

  if (!extended) {
    return (
      <View className={className} style={style}>
        <Host matchContents>
          <FloatingActionButton onClick={onPress} containerColor={color('accentStrong')} modifiers={modifiers}>
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
          containerColor={color('accentStrong')}
          modifiers={modifiers}
        >
          <ExtendedFloatingActionButton.Icon>
            <View accessibilityLabel={label}>{icon}</View>
          </ExtendedFloatingActionButton.Icon>
          <ExtendedFloatingActionButton.Text>
            <Text color={color('onAccent')}>{label}</Text>
          </ExtendedFloatingActionButton.Text>
        </ExtendedFloatingActionButton>
      </Host>
    </View>
  );
}
