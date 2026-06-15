/**
 * ZIconButton — iOS implementation (SwiftUI via @expo/ui/swift-ui).
 *
 * Renders a native SwiftUI Button inside a Host wrapper (matchContents).
 *
 * Variant → buttonStyle mapping (HIG guidance):
 *   ghost     → buttonStyle('borderless')   — standard icon action, no chrome
 *   secondary → buttonStyle('bordered')     — tinted bordered icon button
 *   primary   → buttonStyle('borderedProminent') — filled, brand-accent background
 *
 * Size → controlSize mapping:
 *   sm → 'small'   md → 'regular'   lg → 'large'
 *
 * The lg+circle combination is a "prominent icon button" on iOS.
 * iOS does not have a floating action button in the HIG sense — the primary
 * create action is exposed via a nav-bar button (handled separately in navigation).
 * We render it here as a borderedProminent button to support the public API
 * without diverging from HIG.
 *
 * Colors from theme/native.ts role tokens (useRoleColors). No hardcoded hex.
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
import { View } from 'react-native';

import { useRoleColors } from '../../theme/native';
import type { ZIconButtonProps, ZIconButtonVariant, ZIconButtonSize } from './z-icon-button.types';

export type { ZIconButtonVariant, ZIconButtonSize, ZIconButtonProps } from './z-icon-button.types';
export type { ZIconButtonShape } from './z-icon-button.types';

type SwiftUIButtonStyle = Parameters<typeof buttonStyle>[0];
type SwiftUIControlSize = Parameters<typeof controlSize>[0];

const STYLE_MAP: Record<ZIconButtonVariant, SwiftUIButtonStyle> = {
  ghost: 'borderless',
  secondary: 'bordered',
  primary: 'borderedProminent',
};

const SIZE_MAP: Record<ZIconButtonSize, SwiftUIControlSize> = {
  sm: 'small',
  md: 'regular',
  lg: 'large',
};

export function ZIconButton({
  label,
  children,
  onPress,
  variant = 'ghost',
  size = 'md',
  disabled: isDisabled = false,
  className,
  testID,
}: ZIconButtonProps) {
  const { color } = useRoleColors();

  const tintModifier =
    variant === 'primary' ? tint(color('accent')) : variant === 'secondary' ? tint(color('outline')) : undefined;

  const modifiers = [
    buttonStyle(STYLE_MAP[variant]),
    controlSize(SIZE_MAP[size]),
    disabled(isDisabled),
    accessibilityLabel(label),
    ...(testID ? [accessibilityIdentifier(testID)] : []),
    ...(tintModifier ? [tintModifier] : []),
  ];

  // Outer NativeWind View carries className so that consumer layout classes
  // (e.g. "absolute bottom-6 right-6" for FAB positioning) are applied on
  // real device builds. The @expo/ui Host does not honor NativeWind classes
  // reliably, so the wrapper View is required. matchContents makes the Host
  // size to the SwiftUI intrinsic size; the outer View is layout-transparent
  // except for the forwarded className.
  return (
    <View className={className}>
      <Host matchContents>
        <Button onPress={onPress} modifiers={modifiers}>
          <View>{children}</View>
        </Button>
      </Host>
    </View>
  );
}
