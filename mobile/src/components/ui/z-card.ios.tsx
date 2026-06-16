/**
 * ZCard — iOS implementation (Tier: Native)
 *
 * SwiftUI `Section` only works inside a List/Form and is NOT a drop-in
 * standalone container. iOS therefore uses a role-token-styled RN View that
 * approximates the inset-grouped-list-card feel from the HIG:
 *   - `surface` background (white in light, warm-dark in dark)
 *   - 16 pt corner radius (Material handoff filled-card radius)
 *   - borderless (filled-tonal direction); the warm screen background separates
 *     the card from the canvas without an outline
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
          borderRadius: 16,
          borderWidth: 0,
          padding: 16,
          // Material handoff (filled-tonal): borderless card. The warm screen
          // background provides enough separation against the `surface` fill,
          // so no border and no explicit shadow (no raw hex values).
        }}
      >
        {children}
      </View>
    </View>
  );
}
