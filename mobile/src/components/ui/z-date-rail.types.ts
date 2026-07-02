/**
 * ZDateRail — horizontal day-pill rail (Tier: Custom-RN (b), no native widget).
 *
 * A scrollable row of date pills (weekday/"Today" · day-number · month). Single
 * shared NativeWind implementation (no .ios/.android split) — the look is one
 * branded canvas on both platforms. Press via Touchable; role tokens only.
 */
import type { StyleProp, ViewStyle } from 'react-native';

export type ZDateRailDay = {
  /** Stable identity for the day (e.g. a Date.toDateString() key). */
  key: string;
  /** Top line — weekday abbreviation or a localized "Today". */
  label: string;
  /** Day-of-month number, e.g. "18". */
  day: string;
  /** Month abbreviation, e.g. "Jun". */
  month: string;
  /** Whether this is today (drives emphasis only; label is caller-controlled). */
  isToday?: boolean;
};

export type ZDateRailProps = {
  days: ZDateRailDay[];
  /** Currently selected day key, or '' when none. */
  selectedKey: string;
  onSelect: (key: string) => void;
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** Rail container testID; each pill gets `${testID}-${index}`. */
  testID?: string;
};
