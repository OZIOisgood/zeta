/**
 * ZCard — iOS implementation (Tier: Native)
 *
 * SwiftUI `Section` only works inside a List/Form and is NOT a drop-in
 * standalone container. iOS therefore uses a role-token-styled RN View that
 * approximates the inset-grouped-list-card feel from the HIG.
 *
 * Surface / tone (Material You — the fill tint carries elevation):
 *   - `filled` (default): warm near-white `surface` fill, borderless. (`surface`
 *     is the token that renders the inset-grouped "white" card; we never hardcode
 *     white — colors come only from role tokens, per the design rules.)
 *   - tone='accent'    → accentContainer fill (featured surface).
 *   - tone='secondary' → secondaryContainer fill (secondary-emphasis surface).
 *   - `outlined` (legacy): surface fill + a 1pt `outline` hairline border.
 *   - `elevated` (legacy): surface fill + a subtle drop shadow instead of a tint.
 *
 * Corner radius: 14pt by default (HIG inset-grouped card), 28pt when `hero`.
 *
 * Colors come exclusively from theme/native.ts role tokens via useRoleColors().
 * `className` is forwarded to an outer NativeWind View so that consumer layout
 * classes (gap-*, flex-row, margins, selected-card highlights) are applied on
 * real device builds. Without this wrapper the @expo/ui Host does not honor
 * NativeWind classes, breaking layout-via-className consumers silently
 * (CI is green because jest uses the bare .tsx fallback).
 *
 * HIG reference: https://developer.apple.com/design/human-interface-guidelines/lists
 */

import type { ViewStyle } from 'react-native';
import { View } from 'react-native';
import { useRoleColors } from '../../theme/native';
import type { ZCardProps } from './z-card.types';

export type { ZCardProps } from './z-card.types';

export function ZCard({
  children,
  className,
  testID,
  tone = 'surface',
  hero = false,
  variant = 'filled',
}: ZCardProps) {
  const { color } = useRoleColors();

  // Fill: outlined/elevated keep the surface fill; otherwise the tonal fill is
  // selected from `tone`.
  const backgroundColor =
    variant === 'filled' && tone === 'accent'
      ? color('accentContainer')
      : variant === 'filled' && tone === 'secondary'
        ? color('secondaryContainer')
        : color('surface');

  const style: ViewStyle = {
    backgroundColor,
    // 14pt inset-grouped card radius (HIG); 28pt for prominent hero cards.
    borderRadius: hero ? 28 : 14,
    padding: 16,
    ...(variant === 'outlined'
      ? { borderWidth: 1, borderColor: color('outline') }
      : { borderWidth: 0 }),
    ...(variant === 'elevated'
      ? {
          // Subtle shadow approximating a Material/HIG elevated card.
          shadowColor: color('onSurface'),
          shadowOpacity: 0.12,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
        }
      : {}),
  };

  return (
    <View className={className}>
      <View testID={testID} style={style}>
        {children}
      </View>
    </View>
  );
}
