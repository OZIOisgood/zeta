/**
 * ZTimeGrid — 3-column grid of selectable start times (Tier: Custom-RN (b)).
 *
 * Domain-free: the consumer maps its slots to `{ startsAt, label }` and gets the
 * `startsAt` back on select. Single shared NativeWind implementation. Cells
 * >= 44dp tall, radius 12; selected = accent fill, unselected = outline inset.
 */
import type { StyleProp, ViewStyle } from 'react-native';

export type ZTimeGridSlot = {
  /** Stable identity for the slot (e.g. the ISO starts_at). */
  startsAt: string;
  /** Display label, e.g. "16:00". */
  label: string;
};

export type ZTimeGridProps = {
  slots: ZTimeGridSlot[];
  /** Currently selected startsAt, or '' when none. */
  selectedStartsAt: string;
  onSelect: (startsAt: string) => void;
  /** Optional muted hint rendered once below the grid (e.g. "Duration 30 min"). */
  hint?: string;
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** Grid container testID; each cell gets `${testID}-${slot.startsAt}`. */
  testID?: string;
};
