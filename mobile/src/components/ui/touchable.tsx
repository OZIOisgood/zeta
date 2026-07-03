/**
 * Touchable — the sanctioned home for raw Pressable press behavior.
 *
 * Screens and z-* primitives compose Touchable rather than reaching for raw
 * Pressable directly. This centralises:
 *   - Platform press feedback (Android ripple, iOS pressed-opacity)
 *   - Haptics (expo-haptics Light impact on press, opt-out via haptic={false})
 *   - Disabled / loading accessibility state
 *
 * Tier: Infra/plumbing (no visual opinions beyond platform press feedback).
 */

import type { ReactNode } from 'react';
import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

export interface TouchableProps {
  children: ReactNode;
  onPress?: () => void;
  /**
   * When true, press is blocked and accessibilityState.disabled is set.
   */
  disabled?: boolean;
  /**
   * When true, press is blocked and accessibilityState.busy is set.
   * Visually identical to disabled — callers add their own loading indicator.
   */
  loading?: boolean;
  /**
   * When true, accessibilityState.selected is set so TalkBack/VoiceOver
   * announce the element as "selected". Omit (undefined) to leave the state
   * unset — do not pass false unless you deliberately want to announce
   * "not selected".
   */
  selected?: boolean;
  /**
   * Fire a Light impact haptic on press. Set to false to suppress.
   * @default true
   */
  haptic?: boolean;
  /** NativeWind class names forwarded to the Pressable container. */
  className?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
  /** Any additional Pressable props (e.g. hitSlop). */
  pressableProps?: Omit<PressableProps, 'onPress' | 'disabled' | 'style' | 'testID' | 'accessibilityLabel' | 'accessibilityRole' | 'accessibilityState' | 'android_ripple' | 'children'>;
}

/**
 * Subtle ripple color for Android — derived from the Zeta border token
 * at low opacity (no raw hex: the token value is `#ead2b8`; we use the
 * closest available neutral with transparency acceptable for a ripple).
 */
export const ANDROID_RIPPLE_COLOR = 'rgba(234, 210, 184, 0.4)';

export function Touchable({
  children,
  onPress,
  disabled = false,
  loading = false,
  selected,
  haptic = true,
  className,
  style,
  accessibilityLabel,
  testID,
  pressableProps,
}: TouchableProps) {
  const isDisabled = disabled || loading;

  function handlePress() {
    if (isDisabled) return;
    if (haptic) {
      // Fire haptics as a non-blocking side effect so the press handler
      // remains synchronous; haptic failures are swallowed silently.
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress?.();
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{
          disabled: isDisabled,
          busy: loading,
          ...(selected !== undefined ? { selected } : {}),
        }}
      disabled={isDisabled}
      onPress={handlePress}
      android_ripple={
        Platform.OS === 'android'
          ? { color: ANDROID_RIPPLE_COLOR }
          : undefined
      }
      style={({ pressed }) => [
        Platform.OS === 'ios' && pressed ? { opacity: 0.6 } : undefined,
        typeof style === 'function' ? (style as (state: { pressed: boolean }) => ViewStyle)({ pressed }) : style,
      ]}
      className={className}
      {...pressableProps}
    >
      {children}
    </Pressable>
  );
}
