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
 *
 * Content-hugging (the FAB must NEVER stretch full-width): the `Host` must
 * shrink to the Compose content. We pass the explicit object form
 * `matchContents={{ horizontal: true, vertical: true }}`. Per the installed
 * @expo/ui types (`HostProps.matchContents?: boolean | { vertical?; horizontal? }`,
 * node_modules/@expo/ui/src/jetpack-compose/Host/index.tsx) the boolean `true`
 * and `{ horizontal: true, vertical: true }` are equivalent — both forward
 * `matchContentsHorizontal=true`/`matchContentsVertical=true` to the native
 * `HostView`, which then applies `WRAP_CONTENT` on both axes and measures the
 * Compose child with `MeasureSpec.UNSPECIFIED` (intrinsic size). We use the
 * object form for explicit intent. The outer wrapper additionally pins
 * `alignSelf: 'flex-start'` so the positioned container hugs the Host instead of
 * filling the parent row — a belt-and-braces guard against any residual
 * full-bleed measurement.
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
      <View className={className} style={[{ alignSelf: 'flex-start' }, style]}>
        <Host matchContents={{ horizontal: true, vertical: true }}>
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
    <View className={className} style={[{ alignSelf: 'flex-start' }, style]}>
      <Host matchContents={{ horizontal: true, vertical: true }}>
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
