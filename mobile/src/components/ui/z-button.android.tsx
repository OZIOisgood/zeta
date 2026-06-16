/**
 * ZButton — Android implementation (Jetpack Compose via @expo/ui/jetpack-compose).
 *
 * Variant → Compose component:
 *   primary → Button (filled, accent)   secondary → OutlinedButton
 *   ghost   → TextButton                danger    → Button (filled, danger)
 *   link    → TextButton (accent text)
 *
 * Colors come exclusively from theme/native.ts role tokens via useRoleColors().
 * Accent-on-light foreground (secondary/link labels) uses the AA-safe deep accent
 * `onAccentContainer` (#c2410c, 5.18:1 on white); the bright accent (#ea580c,
 * 3.56:1) only clears AA for large graphics, not label text.
 *
 * Layout: the Compose Host is wrapped in a NativeWind <View> that forwards
 * `className`/`style` and uses `alignItems:'flex-start'` so the button stays
 * content-width (HIG/M3 default) and never overflows its column; the parent's own
 * alignment still positions the wrapper.
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
import { StyleSheet, View } from 'react-native';

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
  className,
  style,
  testID,
}: ZButtonProps) {
  const { color } = useRoleColors();
  const isInteractionDisabled = isDisabled || loading;

  const modifiers = testID ? [testIDModifier(testID)] : [];

  // Foreground (label / icon / spinner) color per variant.
  // - primary/danger: onAccent (white) on the filled background
  // - secondary/link: AA-safe deep accent (onAccentContainer) on the light surface
  // - ghost:          onSurface
  const fg =
    variant === 'primary' || variant === 'danger'
      ? color('onAccent')
      : variant === 'secondary' || variant === 'link'
        ? color('onAccentContainer')
        : color('onSurface');

  const hasLeading = loading || icon != null;

  const content = hasLeading ? (
    <Row verticalAlignment="center" horizontalArrangement="center" modifiers={[]}>
      {loading ? (
        <LoadingIndicator color={fg} />
      ) : icon != null ? (
        <View>{icon}</View>
      ) : null}
      <Text color={fg} style={{ fontWeight: '600' }}>
        {label}
      </Text>
    </Row>
  ) : (
    <Text color={fg} style={{ fontWeight: '600' }}>
      {label}
    </Text>
  );

  let composed;
  if (variant === 'secondary') {
    composed = (
      <Host matchContents>
        <OutlinedButton
          onClick={onPress}
          enabled={!isInteractionDisabled}
          colors={{
            contentColor: fg,
            disabledContentColor: color('onSurfaceVariant'),
            disabledContainerColor: 'transparent',
          }}
          modifiers={modifiers}
        >
          {content}
        </OutlinedButton>
      </Host>
    );
  } else if (variant === 'ghost' || variant === 'link') {
    composed = (
      <Host matchContents>
        <TextButton
          onClick={onPress}
          enabled={!isInteractionDisabled}
          colors={{
            contentColor: fg,
            disabledContentColor: color('onSurfaceVariant'),
          }}
          modifiers={modifiers}
        >
          {content}
        </TextButton>
      </Host>
    );
  } else {
    // primary and danger: filled Button
    composed = (
      <Host matchContents>
        <Button
          onClick={onPress}
          enabled={!isInteractionDisabled}
          colors={{
            containerColor: variant === 'danger' ? color('danger') : color('accentStrong'),
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

  return (
    <View className={className} style={[styles.wrap, style]}>
      {composed}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-start' },
});
