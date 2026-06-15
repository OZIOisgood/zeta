/**
 * ZIconTile — shared public API types (Tier: Custom-RN)
 *
 * ZIconTile is a Custom-RN primitive: no OS-widget equivalent for a rounded
 * tone-mapped icon tile. Rendered via NativeWind semantic role tokens.
 *
 * Platform files:
 *   - z-icon-tile.tsx — single shared NativeWind implementation (web / iOS / Android / jest)
 *
 * No .ios.tsx / .android.tsx — not applicable (no native widget equivalent).
 */

import type { ReactNode } from 'react';

export type ZIconTileTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';
export type ZIconTileSize = 'sm' | 'md';

export type ZIconTileProps = {
  /**
   * Icon content — an already-coloured icon node (ZSymbol or lucide in the
   * bare fallback). The caller is responsible for matching the icon foreground
   * color to the tone (e.g. danger → colors.danger).
   */
  icon: ReactNode;
  /**
   * Semantic tone that sets the tile background.
   * - neutral  → bg-z-surface-warm
   * - primary  → bg-z-primary-soft
   * - success  → bg-z-success-soft
   * - warning  → bg-z-warning-soft
   * - danger   → bg-z-danger-soft
   * @default 'neutral'
   */
  tone?: ZIconTileTone;
  /**
   * Tile size.
   * - sm → 36 dp (h-9 w-9)
   * - md → 40 dp (h-10 w-10)
   * @default 'md'
   */
  size?: ZIconTileSize;
  testID?: string;
};
