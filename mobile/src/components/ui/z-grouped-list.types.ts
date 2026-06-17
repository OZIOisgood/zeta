/**
 * ZGroupedList — shared public API types
 *
 * Tier: custom-no-native
 *
 * The recurring inset-grouped list idiom — a single surface ZCard holding rows
 * separated by a hairline ZDivider — extracted into one primitive (it was
 * hand-rolled in Profile, Preferences and all three Availability sections).
 *
 * Two render modes:
 *   - embed (default): `ZCard` + mapped rows. Use INSIDE a form ScrollView; no
 *     virtualization (so it never nests a VirtualizedList inside a ScrollView).
 *   - scroll: a virtualized `FlatList` styled as the grouped card, for a
 *     standalone full-height list. Satisfies the "variable-length data lists use
 *     FlatList, never ScrollView + .map()" rule. Never put a scroll ZGroupedList
 *     inside a ScrollView.
 *
 * Composition of ZCard + ZDivider (+ caller rows); no OS-widget equivalent, so
 * Custom-RN, single cross-platform file.
 */

import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export type ZGroupedListTone = 'surface' | 'accent' | 'secondary';

export type ZGroupedListProps<T> = {
  /** Row data. */
  data: readonly T[];
  /** Stable, real-id key for each row. */
  keyExtractor: (item: T, index: number) => string;
  /** Renders one row (e.g. a ZListItem). */
  renderItem: (item: T, index: number) => ReactNode;
  /**
   * Divider inset between consecutive rows. `true` → 16dp; a number aligns the
   * separator under the leading content (avatar/icon-tile). @default true
   */
  inset?: boolean | number;
  /** Card fill tone. @default 'surface' */
  tone?: ZGroupedListTone;
  /**
   * `true` → standalone virtualized FlatList; `false` (default) → ZCard + map
   * for embedding inside a form ScrollView. @default false
   */
  scroll?: boolean;
  /** scroll mode: rendered when `data` is empty. */
  ListEmptyComponent?: ReactNode;
  /** scroll mode: keyboard-dismiss passthrough to the FlatList. */
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
  /** scroll mode: extra content-container style (e.g. bottom padding for a FAB). */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Layout classes applied to the card (embed mode). */
  className?: string;
  testID?: string;
};
