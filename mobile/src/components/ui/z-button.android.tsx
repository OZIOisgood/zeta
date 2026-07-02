/**
 * ZButton — Android implementation (Jetpack Compose via @expo/ui/jetpack-compose).
 *
 * Variant → Compose component:
 *   primary → Button (filled, accent)   secondary      → RN Pressable (outlined)
 *   tonal   → Button (filled tonal,     danger-outline → RN Pressable (red outline)
 *             secondaryContainer)       ghost          → TextButton
 *   danger  → Button (filled, danger)   link           → TextButton (accent text)
 *
 * The two outlined variants (secondary, danger-outline) are rendered with RN
 * rather than Compose OutlinedButton — see the early-return below for why.
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

import { Button, Host, Text, TextButton } from '@expo/ui/jetpack-compose';
import {
  fillMaxHeight,
  fillMaxWidth,
  testID as testIDModifier,
} from '@expo/ui/jetpack-compose/modifiers';
import { ActivityIndicator, Pressable, StyleSheet, Text as RNText, View } from 'react-native';

import { useRoleColors } from '../../theme/native';
import type { ZButtonProps } from './z-button.types';

export type { ZButtonVariant, ZButtonProps } from './z-button.types';

// @expo/ui Compose <Text> does NOT inherit the JS-loaded brand font, and the
// app-wide Text.render patch in _layout.tsx only reaches React Native <Text> —
// not Compose. So name the loaded face explicitly here, or the label renders in
// the system font (Roboto) on device. Interactive labels are 600 (M3 medium)
// per the handoff; Android needs the real weighted face (it cannot synthesize
// the cut from a numeric weight).
const BRAND_LABEL_FACE = 'NunitoSans_600SemiBold';

export function ZButton({
  label,
  onPress,
  variant = 'primary',
  disabled: isDisabled = false,
  loading = false,
  fullWidth = false,
  icon,
  className,
  style,
  testID,
}: ZButtonProps) {
  const { color } = useRoleColors();
  const isInteractionDisabled = isDisabled || loading;

  // fullWidth: the Compose button fills a stretched, fixed-height Host box. We
  // CANNOT keep `matchContents` for full-width — it measures the button at its
  // content width, so fillMaxWidth() has nothing to fill. Instead the Host gets
  // an explicit full-width (alignSelf:'stretch') + fixed-height box and the
  // button fills it (fillMaxWidth + fillMaxHeight). Content-width buttons keep
  // `matchContents`.
  const modifiers = [
    ...(testID ? [testIDModifier(testID)] : []),
    ...(fullWidth ? [fillMaxWidth(), fillMaxHeight()] : []),
  ];
  const hostProps = fullWidth
    ? ({ style: { alignSelf: 'stretch', height: 50 } } as const)
    : ({ matchContents: true } as const);

  // Foreground (label / icon / spinner) color per variant.
  // - primary/danger: onAccent (white) on the filled background
  // - tonal:          onSecondaryContainer on the secondary-container fill
  // - secondary/link: accent (the brand orange) on the light surface — matches
  //   the handoff link/outline text; `accent` adapts (deep orange light, warm
  //   orange dark) so it reads in both modes (onAccentContainer is the dark
  //   on-container text color, wrong as link text on a surface).
  // - ghost:          onSurface
  const fg =
    variant === 'primary' || variant === 'danger'
      ? color('onAccent')
      : variant === 'tonal'
        ? color('onSecondaryContainer')
        : variant === 'secondary' || variant === 'link'
          ? color('accent')
          : variant === 'danger-outline'
            ? color('danger')
            : color('onSurface');

  const hasLeading = loading || icon != null;

  // RN (not @expo/ui) renders two classes of button:
  //  - Outlined variants (secondary, danger-outline): the Compose OutlinedButton
  //    exposes no border-color option and the border() modifier draws sharp
  //    corners — it cannot match the handoff's warm/danger rounded pill.
  //  - ANY variant with a leading node (icon or loading spinner): a Compose
  //    <Row> with an RN interop child mis-lays-out on device — the Host
  //    stretches to full width and icon/label separate to opposite edges (the
  //    Home hero "Book session" bug; invisible to jest, which renders the bare
  //    fallback). The RN pill keeps icon + label adjacent and content-width.
  // Border/fill colors + minHeight are inline — NativeWind arbitrary
  // border-color classes mis-render on Android.
  if (variant === 'secondary' || variant === 'danger-outline' || hasLeading) {
    const outlined = variant === 'secondary' || variant === 'danger-outline';
    const borderColor = variant === 'danger-outline' ? color('danger') : color('outline');
    const filledBg =
      variant === 'primary'
        ? color('accentStrong')
        : variant === 'danger'
          ? color('danger')
          : variant === 'tonal'
            ? color('secondaryContainer')
            : 'transparent';
    return (
      <View className={className} style={[fullWidth ? styles.wrapFull : styles.wrap, style]}>
        <Pressable
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ disabled: isInteractionDisabled, busy: loading }}
          disabled={isInteractionDisabled}
          onPress={onPress}
          // Static style object, NOT a style function: NativeWind's className
          // interop drops the function-style result on Pressable (the fill
          // silently vanished on device — white label directly on the hero).
          style={{
            minHeight: 50,
            borderWidth: outlined ? 1 : 0,
            borderColor: outlined ? borderColor : undefined,
            backgroundColor: outlined ? 'transparent' : filledBg,
          }}
          className={`flex-row items-center justify-center gap-2 rounded-full px-4 ${
            fullWidth ? 'w-full' : 'self-start'
          } ${
            isInteractionDisabled
              ? 'opacity-50'
              : variant === 'danger-outline'
                ? 'active:bg-z-danger-soft'
                : outlined || filledBg === 'transparent'
                  ? 'active:bg-z-surface-warm'
                  : // Filled pills: M3 pressed state layer stand-in (dim, like iOS).
                    'active:opacity-85'
          }`}
        >
          {loading ? (
            <ActivityIndicator size="small" color={fg} />
          ) : icon != null ? (
            <View>{icon}</View>
          ) : null}
          <RNText
            style={{
              color: fg,
              fontWeight: variant === 'link' ? '700' : '600',
              fontFamily: variant === 'link' ? 'NunitoSans_700Bold' : BRAND_LABEL_FACE,
            }}
          >
            {label}
          </RNText>
        </Pressable>
      </View>
    );
  }

  // Below here hasLeading is false — the Compose button carries a plain label.
  const content = (
    <Text color={fg} style={{ fontWeight: variant === 'link' ? '700' : '600', fontFamily: variant === 'link' ? 'NunitoSans_700Bold' : BRAND_LABEL_FACE }}>
      {label}
    </Text>
  );

  // Note: the outlined variants (`secondary`, `danger-outline`) are handled by
  // the RN early-return above (Compose can't recolor the outline). The remaining
  // filled/text variants render via @expo/ui.
  let composed;
  if (variant === 'tonal') {
    // Material-3 filled tonal button: secondary-container fill, lower-emphasis.
    composed = (
      <Host {...hostProps}>
        <Button
          onClick={onPress}
          enabled={!isInteractionDisabled}
          colors={{
            containerColor: color('secondaryContainer'),
            contentColor: color('onSecondaryContainer'),
            // Disabled keeps the enabled fill/text; the wrapper dims to 50%
            // (matches the bare/iOS/RN-secondary). M3's default disabled recolor
            // to surfaceVariant blended into colored surfaces (near-invisible).
            disabledContainerColor: color('secondaryContainer'),
            disabledContentColor: color('onSecondaryContainer'),
          }}
          modifiers={modifiers}
        >
          {content}
        </Button>
      </Host>
    );
  } else if (variant === 'ghost' || variant === 'link') {
    composed = (
      <Host {...hostProps}>
        <TextButton
          onClick={onPress}
          enabled={!isInteractionDisabled}
          colors={{
            contentColor: fg,
            // Keep enabled text color; wrapper dims to 50% when disabled.
            disabledContentColor: fg,
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
      <Host {...hostProps}>
        <Button
          onClick={onPress}
          enabled={!isInteractionDisabled}
          colors={{
            containerColor: variant === 'danger' ? color('danger') : color('accentStrong'),
            contentColor: color('onAccent'),
            // Disabled keeps the filled color; the wrapper dims to 50% (matches
            // the bare/iOS). M3's surfaceVariant disabled recolor vanished into
            // colored surfaces (the "barely visible" disabled button).
            disabledContainerColor: variant === 'danger' ? color('danger') : color('accentStrong'),
            disabledContentColor: color('onAccent'),
          }}
          modifiers={modifiers}
        >
          {content}
        </Button>
      </Host>
    );
  }

  return (
    <View
      className={className}
      style={[fullWidth ? styles.wrapFull : styles.wrap, isInteractionDisabled && styles.disabled, style]}
    >
      {composed}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-start' },
  // fullWidth: wrapper + Host stretch to the container width so the Compose
  // button's fillMaxWidth() has a full-width box to fill.
  wrapFull: { alignSelf: 'stretch' },
  // Disabled/loading: dim the whole (still color-filled) button to 50% — the
  // shared cross-platform disabled treatment (bare opacity-50, iOS .disabled()).
  disabled: { opacity: 0.5 },
});
