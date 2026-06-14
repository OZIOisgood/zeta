/**
 * ZButton — Android implementation (Jetpack Compose via @expo/ui/jetpack-compose).
 *
 * Renders a native Compose Button inside a Host wrapper that auto-sizes to
 * content (`matchContents`). Variant → Compose button component mapping:
 *
 *   primary   → Button (filled)       — Material 3 filled button, `containerColor`=accent
 *   secondary → OutlinedButton        — Material 3 outlined button, `contentColor`=accent
 *   ghost     → TextButton            — Material 3 text button, `contentColor`=onSurface
 *   danger    → Button (filled)       — filled button, `containerColor`=danger
 *   link      → TextButton            — text button, `contentColor`=accent (inline link)
 *
 * Colors come exclusively from theme/native.ts role tokens via useRoleColors().
 * No hardcoded hex values.
 *
 * Notes:
 *   - Compose Button `children` accepts any Compose content; we use Row + Text
 *     for the label, and optionally prepend a LoadingIndicator or an RN icon
 *     wrapper inside the Row.
 *   - The `onClick` prop is the Compose equivalent of `onPress`.
 *   - `enabled` (not `disabled`) controls interactivity in Compose.
 *   - `testID` is forwarded via the `testID` modifier.
 *   - Ripple effect is native — no custom press state needed.
 *   - Host `matchContents` sizes the Compose view to its intrinsic size;
 *     the caller controls width by wrapping in a RN View with `alignSelf`.
 *
 * @expo/ui version: ~56.0.17
 * Material 3 reference: https://m3.material.io/components/buttons/overview
 */

import {
  Button,
  Host,
  LoadingIndicator,
  OutlinedButton,
  Row,
  Text,
  TextButton,
} from '@expo/ui/jetpack-compose';
import { testID as testIDModifier } from '@expo/ui/jetpack-compose/modifiers';
import { View } from 'react-native';

import { useRoleColors } from '../../theme/native';
import type { ZButtonProps } from './z-button.types';

export type { ZButtonVariant, ZButtonProps } from './z-button.types';

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

  const modifiers = testID ? [testIDModifier(testID)] : [];

  // Build the children content (Row with optional leading icon/spinner + label).
  const hasLeading = loading || icon != null;

  const content = hasLeading ? (
    <Row verticalAlignment="center" horizontalArrangement="center" modifiers={[]}>
      {loading ? (
        <LoadingIndicator color={variant === 'primary' || variant === 'danger' ? color('onAccent') : color('accent')} />
      ) : icon != null ? (
        // RN icon nodes are not natively composable inside Compose trees; wrap
        // them in a View so RN renders them adjacent to the Compose Text. This
        // approach works because @expo/ui Compose Host slots accept RN children.
        <View>{icon}</View>
      ) : null}
      <Text
        color={
          variant === 'primary' || variant === 'danger'
            ? color('onAccent')
            : variant === 'secondary' || variant === 'link'
              ? color('accent')
              : color('onSurface')
        }
        style={{ fontWeight: '600' }}
      >
        {label}
      </Text>
    </Row>
  ) : (
    <Text
      color={
        variant === 'primary' || variant === 'danger'
          ? color('onAccent')
          : variant === 'secondary' || variant === 'link'
            ? color('accent')
            : color('onSurface')
      }
      style={{ fontWeight: '600' }}
    >
      {label}
    </Text>
  );

  // Select the Compose button component family based on variant.
  if (variant === 'secondary') {
    return (
      <Host matchContents>
        <OutlinedButton
          onClick={onPress}
          enabled={!isInteractionDisabled}
          colors={{
            contentColor: color('accent'),
            disabledContentColor: color('onSurfaceVariant'),
            disabledContainerColor: 'transparent',
          }}
          modifiers={modifiers}
        >
          {content}
        </OutlinedButton>
      </Host>
    );
  }

  if (variant === 'ghost' || variant === 'link') {
    return (
      <Host matchContents>
        <TextButton
          onClick={onPress}
          enabled={!isInteractionDisabled}
          colors={{
            contentColor: variant === 'link' ? color('accent') : color('onSurface'),
            disabledContentColor: color('onSurfaceVariant'),
          }}
          modifiers={modifiers}
        >
          {content}
        </TextButton>
      </Host>
    );
  }

  // primary and danger: filled Button
  return (
    <Host matchContents>
      <Button
        onClick={onPress}
        enabled={!isInteractionDisabled}
        colors={{
          containerColor: variant === 'danger' ? color('danger') : color('accent'),
          contentColor: color('onAccent'),
          disabledContainerColor: color('surfaceVariant'),
          disabledContentColor: color('onSurfaceVariant'),
        }}
        modifiers={modifiers}
      >
        {content}
      </Button>
    </Host>
  );
}
