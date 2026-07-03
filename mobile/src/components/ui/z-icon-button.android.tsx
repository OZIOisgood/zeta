/**
 * ZIconButton — Android implementation (Jetpack Compose via @expo/ui/jetpack-compose).
 *
 * Renders a native Compose icon button inside a Host wrapper (matchContents).
 *
 * Variant → Compose component mapping (Material 3):
 *   ghost     → IconButton          — standard no-background icon button
 *   secondary → OutlinedIconButton  — bordered icon button (no fill)
 *   primary   → FilledIconButton    — filled icon button with accent background
 *
 * FAB: when variant='primary' AND size='lg' AND shape='circle', renders a
 * Material 3 FloatingActionButton (standard size). For size='md' primary+circle
 * uses SmallFloatingActionButton. This matches Material 3's FAB guidance:
 * https://m3.material.io/components/floating-action-button/overview
 *
 * Disabled via `enabled` prop (Compose convention; no `disabled` prop).
 * testID forwarded via semantics modifier.
 * Colors from theme/native.ts role tokens (useRoleColors). No hardcoded hex.
 *
 * Material 3 reference: https://m3.material.io/components/icon-buttons/overview
 *
 * @expo/ui version: ~56.0.17
 */

import {
  FilledIconButton,
  FloatingActionButton,
  Host,
  IconButton,
  OutlinedIconButton,
  SmallFloatingActionButton,
} from '@expo/ui/jetpack-compose';
import { testID as testIDModifier } from '@expo/ui/jetpack-compose/modifiers';
import { View } from 'react-native';

import { useRoleColors } from '../../theme/native';
import type { ZIconButtonProps, ZIconButtonVariant, ZIconButtonSize, ZIconButtonShape } from './z-icon-button.types';

export type { ZIconButtonVariant, ZIconButtonSize, ZIconButtonShape, ZIconButtonProps } from './z-icon-button.types';

/** Returns true when the combination should render as a Material FAB. */
function isFAB(variant: ZIconButtonVariant, size: ZIconButtonSize, shape: ZIconButtonShape): boolean {
  return variant === 'primary' && shape === 'circle' && (size === 'lg' || size === 'md');
}

export function ZIconButton({
  label,
  children,
  onPress,
  variant = 'ghost',
  size = 'md',
  shape = 'rounded',
  disabled = false,
  className,
  testID,
}: ZIconButtonProps) {
  const { color } = useRoleColors();
  const modifiers = testID ? [testIDModifier(testID)] : [];

  // Outer NativeWind View carries className so that consumer layout classes
  // (e.g. "absolute bottom-6 right-6" for FAB positioning) are applied on
  // real device builds. The @expo/ui Host does not honor NativeWind classes
  // reliably, so this wrapper is required. matchContents makes each Host size
  // to the Compose intrinsic size; the outer View is layout-transparent except
  // for the forwarded className.

  // FAB path: Material 3 FloatingActionButton (lg) or SmallFloatingActionButton (md).
  // FloatingActionButton does not expose an `enabled` prop in @expo/ui — disable
  // by omitting onPress; use surfaceVariant containerColor when disabled so the
  // FAB is visually dimmed and clearly non-interactive (Material 3 disabled state).
  if (isFAB(variant, size, shape)) {
    const FABComponent = size === 'lg' ? FloatingActionButton : SmallFloatingActionButton;

    return (
      <View className={className}>
        <Host matchContents>
          <FABComponent
            onClick={disabled ? undefined : onPress}
            containerColor={disabled ? color('surfaceVariant') : color('accentStrong')}
            modifiers={modifiers}
          >
            <FABComponent.Icon>
              {/* pointerEvents="none": the RN interop view sits ON TOP of the
                  Compose button and swallows taps on the icon area otherwise —
                  the button then has a dead center exactly where users tap
                  (verified on device: center taps never fired onClick). */}
              <View accessibilityLabel={label} pointerEvents="none">{children}</View>
            </FABComponent.Icon>
          </FABComponent>
        </Host>
      </View>
    );
  }

  // Standard icon button path.
  // pointerEvents="none": see FAB path — without it the RN interop view
  // swallows taps on the icon area and the button has a dead center.
  const iconContent = (
    <View accessibilityLabel={label} pointerEvents="none">{children}</View>
  );

  if (variant === 'secondary') {
    return (
      <View className={className}>
        <Host matchContents>
          <OutlinedIconButton
            onClick={onPress}
            enabled={!disabled}
            colors={{
              contentColor: color('accent'),
              disabledContainerColor: 'transparent',
              disabledContentColor: color('onSurfaceVariant'),
            }}
            modifiers={modifiers}
          >
            {iconContent}
          </OutlinedIconButton>
        </Host>
      </View>
    );
  }

  if (variant === 'primary') {
    return (
      <View className={className}>
        <Host matchContents>
          <FilledIconButton
            onClick={onPress}
            enabled={!disabled}
            colors={{
              containerColor: color('accentStrong'),
              contentColor: color('onAccent'),
              disabledContainerColor: color('surfaceVariant'),
              disabledContentColor: color('onSurfaceVariant'),
            }}
            modifiers={modifiers}
          >
            {iconContent}
          </FilledIconButton>
        </Host>
      </View>
    );
  }

  // ghost (default)
  return (
    <View className={className}>
      <Host matchContents>
        <IconButton
          onClick={onPress}
          enabled={!disabled}
          colors={{
            contentColor: color('onSurface'),
            disabledContentColor: color('onSurfaceVariant'),
          }}
          modifiers={modifiers}
        >
          {iconContent}
        </IconButton>
      </Host>
    </View>
  );
}
