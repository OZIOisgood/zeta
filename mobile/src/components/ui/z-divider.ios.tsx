/**
 * ZDivider — iOS implementation (Tier: Custom RN).
 *
 * iOS table-separator style: a 0.5pt (hairline) line drawn with the `outline`
 * role token. The `inset` variant applies the HIG 16pt leading inset used by
 * grouped table separators.
 *
 * No OS widget maps to a standalone divider, so this is a role-token-styled RN
 * View rather than an @expo/ui component. `className` is still forwarded onto an
 * outer NativeWind View so consumer layout classes (margins, alignment) apply on
 * real device builds — and to satisfy the native className-forwarding contract.
 *
 * Colors come exclusively from theme/native.ts role tokens via useRoleColors().
 *
 * HIG reference: https://developer.apple.com/design/human-interface-guidelines/lists
 */

import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
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

  // 0.5pt hairline stroke (table-separator weight on iOS).
  const stroke = StyleSheet.hairlineWidth;

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
