/**
 * ZCard — Android implementation (Jetpack Compose via @expo/ui/jetpack-compose).
 *
 * Renders a native Compose `Card` (Material 3 filled card surface) with
 * role-token colors. Material You direction — the container tone carries
 * elevation, so the default filled card is borderless and flat:
 *
 *   - tone='surface'   (default) → containerColor = `surface`
 *   - tone='accent'              → containerColor = `accentContainer`
 *   - tone='secondary'           → containerColor = `secondaryContainer`
 *   - variant='outlined' (legacy)→ surface fill + 1dp `outline` border overlay
 *   - variant='elevated' (legacy)→ ~2dp elevation (soft drop shadow)
 *
 * Shape: 20dp corner radius by default, 28dp when `hero` — applied via the
 * `clip` modifier (Shapes.RoundedCorner) since CardProps has no shape arg.
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
import { Shapes, clip } from '@expo/ui/jetpack-compose/modifiers';
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

  // Container fill: outlined/elevated keep the surface fill; otherwise the
  // tonal fill is selected from `tone`.
  const containerColor =
    variant === 'filled' && tone === 'accent'
      ? color('accentContainer')
      : variant === 'filled' && tone === 'secondary'
        ? color('secondaryContainer')
        : color('surface');

  // 20dp default radius, 28dp for prominent hero cards.
  const radius = hero ? 28 : 20;

  return (
    // Outer NativeWind View carries className (layout extensions from consumer)
    // and testID. Android Host's PrimitiveBaseProps does not include a testID
    // field (unlike iOS Host), so testID lives on this wrapper View.
    <View className={className} testID={testID}>
      {/* Both dimensions: horizontal-only collapses the card to 0 height in a
          height-auto/centered parent (Compose Host sizes the unmatched axis to
          the parent, which is unconstrained here) → invisible card. */}
      <Host matchContents={{ horizontal: true, vertical: true }}>
        <Card
          colors={{ containerColor }}
          // Filled/outlined cards are flat (tone carries elevation); the legacy
          // elevated variant gets a soft ~2dp Material drop shadow.
          elevation={variant === 'elevated' ? 2 : 0}
          // Legacy outlined: 1dp warm hairline border on the surface fill.
          border={
            variant === 'outlined' ? { width: 1, color: color('outline') } : undefined
          }
          modifiers={[clip(Shapes.RoundedCorner(radius))]}
        >
          {/* p-4 equivalent (16dp) applied via RN View so content respects the contract */}
          <View style={{ padding: 16 }}>{children}</View>
        </Card>
      </Host>
    </View>
  );
}
