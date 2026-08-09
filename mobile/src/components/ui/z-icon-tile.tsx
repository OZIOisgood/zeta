import type { ReactNode } from 'react';
import { View } from 'react-native';

export type ZIconTileTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';
export type ZIconTileSize = 'sm' | 'md';

/**
 * Rounded tone-mapped glyph tile. The recurring `h-10 w-10 rounded-xl` icon
 * block that list rows, the danger-zone card, and section headers re-inline.
 * Background is a `z-*-soft` token surface per tone (never the saturated base
 * token, which would hide the glyph); the caller passes an already-coloured
 * lucide glyph as `icon` so the foreground matches the tone:
 *   neutral  → color('accent')    (on bg-z-surface-warm)
 *   primary  → color('accent')    (on bg-z-primary-soft)
 *   success  → color('success')    (on bg-z-success-soft)
 *   warning  → color('warning')    (on bg-z-warning-soft)
 *   danger   → color('danger')     (on bg-z-danger-soft)
 *
 * The web counterpart uses `bg-[var(--z-surface-warm)] text-[var(--z-primary)]`
 * for neutral/primary icon tiles (group-details-page.component.ts lines 122, 154).
 * Destructive tiles use a soft rose surface with a saturated danger glyph, as
 * ZConfirmDialog already demonstrates (bg-rose-50 / color={color('danger')}).
 */
const toneSurface: Record<ZIconTileTone, string> = {
  neutral: 'bg-z-surface-warm',
  primary: 'bg-z-primary-soft',
  success: 'bg-z-success-soft',
  warning: 'bg-z-warning-soft',
  danger: 'bg-z-danger-soft',
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
      className={`items-center justify-center rounded-xl ${sizeClasses[size]} ${toneSurface[tone]}`}
    >
      {icon}
    </View>
  );
}
