/**
 * ZButton — iOS implementation (SwiftUI via @expo/ui/swift-ui).
 *
 * Renders a native SwiftUI Button inside a Host wrapper that auto-sizes to
 * content (`matchContents`). Variant → SwiftUI buttonStyle + role mapping:
 *
 *   primary   → buttonStyle('borderedProminent') + tint(accent)
 *   tonal     → buttonStyle('bordered') + tint(secondaryContainer)
 *   secondary → buttonStyle('bordered') + tint(outline)
 *   ghost     → buttonStyle('borderless')
 *   danger    → buttonStyle('bordered') + role='destructive'
 *   link      → buttonStyle('plain') + tint(accent)
 *
 * Colors come exclusively from theme/native.ts role tokens via useRoleColors().
 * No hardcoded hex values.
 *
 * Layout: the SwiftUI Host is wrapped in a NativeWind <View> that forwards
 * `className`/`style` (the Host does not honor NativeWind on device). The wrapper
 * uses `alignItems:'flex-start'` so the button stays content-width (HIG default)
 * and never stretches past its container in a column; the parent's own alignment
 * still positions the wrapper. Consumers add margins/positioning via `className`.
 *
 * @expo/ui version: ~56.0.17
 * HIG reference: https://developer.apple.com/design/human-interface-guidelines/buttons
 */

import { Button, Host, HStack, ProgressView, Text } from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  accessibilityLabel,
  buttonStyle,
  controlSize,
  disabled,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, View } from 'react-native';

import { useRoleColors } from '../../theme/native';
import type { ZButtonProps, ZButtonVariant } from './z-button.types';

export type { ZButtonVariant, ZButtonProps } from './z-button.types';

type SwiftUIButtonStyle = Parameters<typeof buttonStyle>[0];
type SwiftUIButtonRole = 'default' | 'cancel' | 'destructive';

/** Maps ZButtonVariant to SwiftUI buttonStyle string. */
const STYLE_MAP: Record<ZButtonVariant, SwiftUIButtonStyle> = {
  primary: 'borderedProminent',
  // Tonal uses the tinted `bordered` fill style; the secondary-container tint
  // (below) gives it the soft "on" fill that reads as a lower-emphasis action.
  tonal: 'bordered',
  secondary: 'bordered',
  ghost: 'borderless',
  danger: 'bordered',
  link: 'plain',
};

/** Maps ZButtonVariant to SwiftUI ButtonRole (only destructive is non-default). */
const ROLE_MAP: Record<ZButtonVariant, SwiftUIButtonRole> = {
  primary: 'default',
  tonal: 'default',
  secondary: 'default',
  ghost: 'default',
  danger: 'destructive',
  link: 'default',
};

export function ZButton({
  label,
  onPress,
  variant = 'primary',
  disabled: isDisabled = false,
  loading = false,
  icon,
  className,
  style,
  testID,
}: ZButtonProps) {
  const { color } = useRoleColors();
  const isInteractionDisabled = isDisabled || loading;

  // Build the tint modifier. The `danger` variant relies on SwiftUI's built-in
  // destructive role color (system red); we don't override it with a tint.
  // For `ghost` no tint is set — the system foreground color applies.
  // primary: tint = the filled background (accentStrong — note accent ≠
  // accentStrong in dark mode). tonal: tint the tinted `bordered` fill with
  // secondaryContainer so it reads as the soft "on" fill (Material-3 tonal).
  // link: tint colors the plain text label sitting on a light surface, so use
  // the AA-safe deep accent (onAccentContainer #c2410c, 5.18:1) instead of the
  // bright accent (3.56:1).
  const tintModifier =
    variant === 'primary'
      ? tint(color('accentStrong'))
      : variant === 'tonal'
        ? tint(color('secondaryContainer'))
        : variant === 'link'
          ? tint(color('onAccentContainer'))
          : variant === 'secondary'
            ? tint(color('outline'))
            : undefined;

  const modifiers = [
    buttonStyle(STYLE_MAP[variant]),
    controlSize('large'),
    disabled(isInteractionDisabled),
    accessibilityLabel(label),
    ...(testID ? [accessibilityIdentifier(testID)] : []),
    ...(tintModifier ? [tintModifier] : []),
  ];

  // For the label-only case (no icon, no loading) use the simpler `label` prop
  // path. When there is an icon or loading indicator we use `children` (HStack).
  const hasCustomContent = loading || icon != null;

  const composed = !hasCustomContent ? (
    <Host matchContents>
      <Button role={ROLE_MAP[variant]} onPress={onPress} label={label} modifiers={modifiers} />
    </Host>
  ) : (
    <Host matchContents>
      <Button role={ROLE_MAP[variant]} onPress={onPress} modifiers={modifiers}>
        <HStack spacing={6} alignment="center">
          {loading ? (
            // Indeterminate spinner: ProgressView with no value prop.
            <ProgressView modifiers={[controlSize('small')]} />
          ) : icon != null ? (
            // Wrap the RN icon node in a View so it renders inside SwiftUI.
            <View>{icon}</View>
          ) : null}
          <Text>{label}</Text>
        </HStack>
      </Button>
    </Host>
  );

  return (
    <View className={className} style={[styles.wrap, style]}>
      {composed}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-start' },
});
