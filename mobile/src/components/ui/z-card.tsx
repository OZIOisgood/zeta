import { View } from 'react-native';
import type { ZCardProps } from './z-card.types';

export type { ZCardProps } from './z-card.types';

/**
 * ZCard — NativeWind fallback (web / Storybook / jest).
 *
 * Section card surface. Mobile counterpart of the recurring web section card,
 * realigned to the Material handoff (filled-tonal direction):
 *   - default `filled` variant is a borderless warm tonal `surface` card with a
 *     20px corner radius — the fill tint carries elevation (Material You), so
 *     the warm screen background gives enough separation without an outline.
 *   - `tone` swaps the fill to accentContainer / secondaryContainer for
 *     featured / secondary-emphasis surfaces.
 *   - `hero` bumps the corner radius to 28px for prominent feature cards.
 *   - legacy `outlined` (white + warm hairline border) and `elevated` (soft
 *     shadow) variants remain available for un-migrated screens.
 *
 * On native platforms the .ios.tsx and .android.tsx variants replace this with
 * OS-native widgets.
 */
export function ZCard({
  children,
  className,
  testID,
  tone = 'surface',
  hero = false,
  variant = 'filled',
}: ZCardProps) {
  // Corner radius: 20px default, 28px for hero feature cards.
  const radius = hero ? 'rounded-[28px]' : 'rounded-[20px]';

  // Fill + treatment. Outlined/elevated are legacy looks; otherwise the tonal
  // fill is chosen from `tone`.
  let fill: string;
  if (variant === 'outlined') {
    fill = 'border border-outline bg-white';
  } else if (tone === 'accent') {
    fill = 'bg-accent-container';
  } else if (tone === 'secondary') {
    fill = 'bg-secondary-container';
  } else {
    fill = 'bg-surface';
  }

  const shadow = variant === 'elevated' ? ' shadow-sm' : '';

  // Consumer className is appended last so layout/state classes (margins,
  // gap-*, selected-card highlights) win over the base classes.
  const classes = `${radius} ${fill} p-4${shadow}${className ? ` ${className}` : ''}`;

  return (
    <View testID={testID} className={classes}>
      {children}
    </View>
  );
}
