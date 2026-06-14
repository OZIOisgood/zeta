/**
 * ZButton — iOS implementation (SwiftUI via @expo/ui/swift-ui).
 *
 * Renders a native SwiftUI Button inside a Host wrapper that auto-sizes to
 * content (`matchContents`). Variant → SwiftUI buttonStyle + role mapping:
 *
 *   primary   → buttonStyle('borderedProminent') + tint(accent)
 *               — filled, brand-accent background (HIG "filled" button)
 *   secondary → buttonStyle('bordered') + tint(outline)
 *               — bordered / tinted outline (HIG "tinted" button)
 *   ghost     → buttonStyle('borderless')
 *               — no chrome, system foreground (HIG "plain" action)
 *   danger    → buttonStyle('bordered') + role='destructive'
 *               — SwiftUI renders destructive role in system red
 *   link      → buttonStyle('plain') + tint(accent)
 *               — plain text in brand accent, no chrome (inline link)
 *
 * Colors come exclusively from theme/native.ts role tokens via useRoleColors().
 * No hardcoded hex values.
 *
 * Notes:
 *   - The `icon` prop is passed as children inside an HStack. SwiftUI Button
 *     natively supports a label view as children; the `label` string prop
 *     handles the simple-text case and `children` handles custom content.
 *     We use `children` to compose icon + label text via HStack.
 *   - `loading` disables the button and shows an indeterminate ProgressView
 *     in place of the icon slot.
 *   - `testID` is forwarded via the `accessibilityIdentifier` modifier.
 *   - Host `matchContents` sizes the native view to its SwiftUI intrinsic size;
 *     the caller controls width by wrapping in a RN View with `alignSelf`.
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
import { View } from 'react-native';

import { useRoleColors } from '../../theme/native';
import type { ZButtonProps, ZButtonVariant } from './z-button.types';

export type { ZButtonVariant, ZButtonProps } from './z-button.types';

type SwiftUIButtonStyle = Parameters<typeof buttonStyle>[0];
type SwiftUIButtonRole = 'default' | 'cancel' | 'destructive';

/** Maps ZButtonVariant to SwiftUI buttonStyle string. */
const STYLE_MAP: Record<ZButtonVariant, SwiftUIButtonStyle> = {
  primary: 'borderedProminent',
  secondary: 'bordered',
  ghost: 'borderless',
  danger: 'bordered',
  link: 'plain',
};

/** Maps ZButtonVariant to SwiftUI ButtonRole (only destructive is non-default). */
const ROLE_MAP: Record<ZButtonVariant, SwiftUIButtonRole> = {
  primary: 'default',
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
  testID,
}: ZButtonProps) {
  const { color } = useRoleColors();
  const isInteractionDisabled = isDisabled || loading;

  // Build the tint modifier. The `danger` variant relies on SwiftUI's built-in
  // destructive role color (system red); we don't override it with a tint.
  // For `ghost` no tint is set — the system foreground color applies.
  const tintModifier =
    variant === 'primary' || variant === 'link'
      ? tint(color('accent'))
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

  if (!hasCustomContent) {
    return (
      <Host matchContents>
        <Button role={ROLE_MAP[variant]} onPress={onPress} label={label} modifiers={modifiers} />
      </Host>
    );
  }

  return (
    <Host matchContents>
      <Button role={ROLE_MAP[variant]} onPress={onPress} modifiers={modifiers}>
        <HStack spacing={6} alignment="center">
          {loading ? (
            // Indeterminate spinner: ProgressView with no value prop.
            <ProgressView modifiers={[controlSize('small')]} />
          ) : icon != null ? (
            // Wrap the RN icon node in a plain Host so it renders inside SwiftUI.
            // The icon is a lucide RN element; expose it via RNHostView slot.
            <View>{icon}</View>
          ) : null}
          <Text>{label}</Text>
        </HStack>
      </Button>
    </Host>
  );
}
