/**
 * ZCard — iOS implementation (Tier: Native)
 *
 * SwiftUI `Section` only works inside a List/Form and is NOT a drop-in
 * standalone container. iOS therefore uses a role-token-styled RN View that
 * approximates the inset-grouped-list-card feel from the HIG:
 *   - `surface` background (white in light, warm-dark in dark)
 *   - 12 pt corner radius (matches iOS grouped-list inset card radius)
 *   - `outline` border at 1px to separate cards on `surfaceVariant` background
 *   - Soft shadow (elevation-1-equivalent) to signal elevation
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

import { View } from 'react-native';
import { useRoleColors } from '../../theme/native';
import type { ZCardProps } from './z-card.types';

export type { ZCardProps } from './z-card.types';

export function ZCard({ children, className, testID }: ZCardProps) {
  const { color } = useRoleColors();

  return (
    <View className={className}>
      <View
        testID={testID}
        style={{
          backgroundColor: color('surface'),
          borderRadius: 12,
          borderWidth: 1,
          borderColor: color('outline'),
          padding: 16,
          // iOS inset-grouped feel: border is the delimiter; no explicit shadow.
          // shadowColor is intentionally omitted — the border + surface background
          // provides enough visual separation without raw hex values.
        }}
      >
        {children}
      </View>
    </View>
  );
}
