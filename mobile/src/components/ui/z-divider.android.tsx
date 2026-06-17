/**
 * ZDivider — Android implementation (Tier: Custom RN).
 *
 * Material 3 divider: a 1dp full-bleed line drawn with the `outline` role token.
 * The `inset` variant applies a 16dp inset (Material inset divider) along the
 * cross axis.
 *
 * No OS widget maps to a standalone divider, so this is a role-token-styled RN
 * View rather than an @expo/ui component. `className` is still forwarded onto an
 * outer NativeWind View so consumer layout classes (margins, alignment) apply on
 * real device builds — and to satisfy the native className-forwarding contract.
 *
 * Colors come exclusively from theme/native.ts role tokens via useRoleColors().
 *
 * Material 3 reference: https://m3.material.io/components/divider/overview
 */

import type { ViewStyle } from 'react-native';
import { View } from 'react-native';
import { useRoleColors } from '../../theme/native';
import type { ZDividerProps } from './z-divider.types';

export type { ZDividerProps } from './z-divider.types';

export function ZDivider({
  vertical = false,
  inset = false,
  className,
  style,
  testID,
}: ZDividerProps) {
  const { color } = useRoleColors();

  // 1dp stroke (Material 3 divider thickness).
  const stroke = 1;

  const lineStyle: ViewStyle = vertical
    ? {
        width: stroke,
        height: '100%',
        backgroundColor: color('outline'),
        ...(inset ? { marginVertical: 16 } : {}),
      }
    : {
        height: stroke,
        width: '100%',
        backgroundColor: color('outline'),
        ...(inset ? { marginHorizontal: 16 } : {}),
      };

  return (
    <View className={className}>
      <View testID={testID} style={[lineStyle, style]} />
    </View>
  );
}
