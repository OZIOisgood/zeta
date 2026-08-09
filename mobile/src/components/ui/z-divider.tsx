/**
 * ZDivider — single-file Custom-RN primitive (Tier: custom-no-native).
 *
 * A thin separator rule drawn with the `outline` role token. No OS widget maps
 * to a standalone divider, so — exactly like ZBadge / ZSwitch — this is ONE
 * cross-platform file. The only per-platform difference is the stroke weight
 * (0.5pt hairline on iOS, 1dp on Android), handled inline via `Platform.OS`;
 * there is no `.ios.tsx` / `.android.tsx` split and no jest moduleNameMapper
 * entry to keep in lock-step.
 *
 * Layout: the line uses `alignSelf: 'stretch'` (NOT `width: '100%'`). With
 * `width: '100%'` an `inset` margin is added OUTSIDE the full width, so on a real
 * device the rule overflows its container by the inset on the right (Yoga does
 * not shrink an explicit 100% width to fit margins). `alignSelf: 'stretch'`
 * makes the cross-axis size fill the parent MINUS the margins, so the inset is a
 * true symmetric inset with no overflow.
 *
 * Colors come exclusively from the `outline` role token via useRoleColors().
 *
 * M3:  https://m3.material.io/components/divider/overview
 * HIG: https://developer.apple.com/design/human-interface-guidelines/lists
 */

import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { useRoleColors } from '../../theme/native';
import type { ZDividerProps } from './z-divider.types';

export type { ZDividerProps } from './z-divider.types';

// 0.5pt hairline on iOS (table-separator weight); 1dp on Android (M3 divider).
const STROKE = Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 1;

/** `inset === true` → the default 16dp table-separator inset; a number is used verbatim. */
function resolveInset(inset: boolean | number): number {
  if (inset === true) return 16;
  if (inset === false) return 0;
  return inset;
}

export function ZDivider({
  vertical = false,
  inset = false,
  className,
  style,
  testID,
}: ZDividerProps) {
  const { color } = useRoleColors();
  const margin = resolveInset(inset);

  const lineStyle: ViewStyle = vertical
    ? {
        width: STROKE,
        height: '100%',
        backgroundColor: color('outline'),
        ...(margin ? { marginVertical: margin } : {}),
      }
    : {
        height: STROKE,
        // stretch (not width:'100%') so the inset margin can't overflow the parent
        alignSelf: 'stretch',
        backgroundColor: color('outline'),
        // Leading-only inset: M3 / HIG list separators inset the leading edge and
        // run to the trailing edge. marginStart is RTL-aware, and `alignSelf:
        // stretch` subtracts it from the width so there is never any overflow.
        ...(margin ? { marginStart: margin } : {}),
      };

  // Single node carries testID + consumer className + the line style. A plain RN
  // View honors NativeWind className directly (no @expo/ui Host), so no separate
  // wrapper is needed and the forwarding contract is identical everywhere.
  return <View testID={testID} className={className} style={[lineStyle, style]} />;
}
