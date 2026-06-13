import type { ReactNode } from 'react';
import { View } from 'react-native';

export type ZIconTileTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';
export type ZIconTileSize = 'sm' | 'md';

/**
 * Rounded tone-mapped glyph tile. The recurring `h-10 w-10 rounded-md` icon
 * block that list rows, the danger-zone card, and section headers re-inline.
 * Background is a `z-*` token surface per tone (never a raw palette class);
 * the caller passes an already-coloured lucide glyph as `icon` so the foreground
 * matches the tone (convention: neutral→colors.primary, primary→colors.primaryStrong,
 * success→colors.success, warning→colors.warning, danger→colors.danger).
 * Counterpart of the web icon-tile used in card/list headers.
 *
 * NOTE on soft surfaces: the NativeWind config defines `z-primary-soft` but not
 * `z-success-soft`, `z-warning-soft`, or `z-danger-soft`. For those tones we
 * fall back to `z-success`, `z-warning`, `z-danger` (the foreground token) as
 * the tile background — slightly more saturated than a soft surface but still
 * token-backed. If the design token set is extended with `*-soft` variants,
 * update the map below and run `pnpm run sync:tokens`.
 */
const toneSurface: Record<ZIconTileTone, string> = {
  neutral: 'bg-z-surface-warm',
  primary: 'bg-z-primary-soft',
  // Fallback: no z-success-soft / z-warning-soft / z-danger-soft in tailwind.config.js.
  // Using the base token. Update when soft variants are added to the token set.
  success: 'bg-z-success',
  warning: 'bg-z-warning',
  danger: 'bg-z-danger',
};

const sizeClasses: Record<ZIconTileSize, string> = {
  sm: 'h-9 w-9',
  md: 'h-10 w-10',
};

export function ZIconTile({
  icon,
  tone = 'neutral',
  size = 'md',
  testID,
}: {
  icon: ReactNode;
  tone?: ZIconTileTone;
  size?: ZIconTileSize;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      className={`items-center justify-center rounded-md ${sizeClasses[size]} ${toneSurface[tone]}`}
    >
      {icon}
    </View>
  );
}
