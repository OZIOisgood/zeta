/**
 * ZCard — Android implementation (Jetpack Compose via @expo/ui/jetpack-compose).
 *
 * Renders a native Compose `Card` (Material 3 filled card surface) with
 * role-token colors:
 *   - `containerColor` → `surface`
 *   - borderless (Material handoff filled-tonal direction) — the Material 3
 *     elevated/filled Card relies on elevation + container tone for separation
 *     rather than an outline
 *   - elevation → 1dp (Material 3 level-1, matches "tonal surface" feel)
 *
 * Colors come exclusively from theme/native.ts role tokens via useRoleColors().
 * `className` is forwarded to an outer NativeWind View so that consumer layout
 * classes (gap-*, flex-row, margins, selected-card highlights) are applied on
 * real device builds. Without this wrapper the @expo/ui Host does not honor
 * NativeWind classes, breaking layout-via-className consumers silently
 * (CI is green because jest uses the bare .tsx fallback). Padding is applied
 * via a wrapping RN View so that the content respects the p-4 contract even
 * inside the Compose card (which handles its own surface clipping).
 *
 * @expo/ui version: ~56.0.17
 * Material 3 reference: https://m3.material.io/components/cards/overview
 */

import { Card, Host } from '@expo/ui/jetpack-compose';
import { View } from 'react-native';
import { useRoleColors } from '../../theme/native';
import type { ZCardProps } from './z-card.types';

export type { ZCardProps } from './z-card.types';

export function ZCard({ children, className, testID }: ZCardProps) {
  const { color } = useRoleColors();

  return (
    // Outer NativeWind View carries className (layout extensions from consumer)
    // and testID. Android Host's PrimitiveBaseProps does not include a testID
    // field (unlike iOS Host), so testID lives on this wrapper View.
    <View className={className} testID={testID}>
      <Host matchContents={{ horizontal: true }}>
        <Card
          colors={{ containerColor: color('surface') }}
          elevation={1}
        >
          {/* p-4 equivalent (16dp) applied via RN View so content respects the contract */}
          <View style={{ padding: 16 }}>{children}</View>
        </Card>
      </Host>
    </View>
  );
}
