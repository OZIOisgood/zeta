/**
 * ZCard — Android implementation (Tier: Native)
 *
 * Material 3 filled-card surface rendered as a role-token-styled RN View
 * (NOT @expo/ui/jetpack-compose). The Compose `Host` dropped its FIRST paint
 * whenever a card mounted in a non-initial React commit — which is exactly what
 * the `isPending → data` swap on every detail screen produces. The card
 * measured and laid out correctly (correct bounds) but never drew until a
 * remount, leaving detail screens blank below the first painted element until
 * the screen was reopened (a cache-hit reopen mounts the cards in the initial
 * commit, so they paint). Forcing a recomposition/remount of the Host did not
 * recover the paint, so this mirrors the iOS implementation (z-card.ios.tsx)
 * and draws the Material surface directly with an RN View, which paints
 * reliably regardless of when the card mounts.
 *
 * Surface / tone (Material You — the fill tint carries elevation):
 *   - tone='surface'   (default) → `surface` fill, borderless.
 *   - tone='accent'              → `accentContainer` fill (featured surface).
 *   - tone='secondary'           → `secondaryContainer` fill (secondary emphasis).
 *   - variant='outlined' (legacy)→ surface fill + 1dp `outline` hairline border.
 *   - variant='elevated' (legacy)→ ~2dp native Material elevation (soft shadow).
 *
 * Shape: 20dp corner radius by default, 28dp when `hero` (Material 3 cards).
 *
 * Colors come exclusively from theme/native.ts role tokens via useRoleColors().
 * `className` is forwarded to an outer NativeWind View so consumer layout
 * classes (gap-*, flex-row, margins, selected-card highlights) are applied on
 * real device builds.
 *
 * Material 3 reference: https://m3.material.io/components/cards/overview
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

  // Container fill: outlined/elevated keep the surface fill; otherwise the
  // tonal fill is selected from `tone`.
  const backgroundColor =
    variant === 'filled' && tone === 'accent'
      ? color('accentContainer')
      : variant === 'filled' && tone === 'secondary'
        ? color('secondaryContainer')
        : color('surface');

  const style: ViewStyle = {
    backgroundColor,
    // 20dp default radius, 28dp for prominent hero cards (Material 3).
    borderRadius: hero ? 28 : 20,
    padding: 16,
    ...(variant === 'outlined'
      ? { borderWidth: 1, borderColor: color('outline') }
      : { borderWidth: 0 }),
    // Legacy elevated look: ~2dp native Material elevation (Android shadow). The
    // filled/outlined cards stay flat — the tonal fill carries the elevation.
    ...(variant === 'elevated' ? { elevation: 2 } : {}),
  };

  return (
    // Outer NativeWind View carries className (consumer layout extensions); the
    // inner styled View draws the Material surface and owns testID.
    <View className={className}>
      <View testID={testID} style={style}>
        {children}
      </View>
    </View>
  );
}
