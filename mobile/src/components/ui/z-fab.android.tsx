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
 * CONTENT-HUG (the FAB must NEVER stretch full-width)
 * ---------------------------------------------------
 * Root cause of the earlier full-width-stretch bug: the outer
 * `<View className={className} style={style}>` (which forwards the consumer's
 * positioning) defaults to `alignItems: 'stretch'` like every RN View. The
 * native `Host` of an EXTENDED FAB has a flexible (content-driven) width, so the
 * parent's cross-axis stretch blew it out to the wrapper's full width. (The
 * collapsed/icon-only FAB never showed it because it is intrinsically square.)
 * `matchContents` only controls how the Host reports its OWN measured size back
 * to RN — it does not stop a stretching parent from overriding that width.
 *
 * Fix (canonical RN content-hug): wrap the `<Host>` in an INNER
 * `<View style={{ alignSelf: 'flex-end' }}>`. `alignSelf` overrides the parent's
 * `alignItems: 'stretch'` on the cross axis, so the inner view (and the Host it
 * contains) shrinks to the Compose content and pins to the right edge — a
 * compact bottom-right pill instead of a full-width bar. The outer View keeps
 * forwarding `className`/`style` for positioning (the native-classname-forwarding
 * contract). Both the extended and icon-only paths use the same inner hug so
 * neither can stretch. `matchContents={{ horizontal: true, vertical: true }}`
 * (equivalent to the boolean `true` per HostProps, node_modules/@expo/ui/src/
 * jetpack-compose/Host/index.tsx — both forward matchContentsHorizontal/Vertical
 * to the native HostView) keeps the Host's reported size equal to its content.
 *
 * Note: the previous start-aligned `alignSelf` guard on the OUTER (absolutely
 * positioned) wrapper was a no-op — `alignSelf` is ignored on an absolutely
 * positioned view — and has been removed.
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
        <View style={{ alignSelf: 'flex-end' }}>
          <Host matchContents={{ horizontal: true, vertical: true }}>
            <FloatingActionButton onClick={onPress} containerColor={containerColor} modifiers={modifiers}>
              <FloatingActionButton.Icon>
                <View accessibilityLabel={label}>{icon}</View>
              </FloatingActionButton.Icon>
            </FloatingActionButton>
          </Host>
        </View>
      </View>
    );
  }

  return (
    <View className={className} style={style}>
      <View style={{ alignSelf: 'flex-end' }}>
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
              <Text color={contentColor} style={{ fontFamily: 'NunitoSans_600SemiBold' }}>{label}</Text>
            </ExtendedFloatingActionButton.Text>
          </ExtendedFloatingActionButton>
        </Host>
      </View>
    </View>
  );
}
