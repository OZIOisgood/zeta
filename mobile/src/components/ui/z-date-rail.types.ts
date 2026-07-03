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
  /**
   * Day without any selectable content (mock: 0.4 opacity, not pressable).
   * Keeps the calendar sequence readable instead of hiding empty days.
   */
  disabled?: boolean;
};

export type ZDateRailProps = {
  days: ZDateRailDay[];
  /** Currently selected day key, or '' when none. */
  selectedKey: string;
  onSelect: (key: string) => void;
  className?: string;
  style?: StyleProp<ViewStyle>;
  /**
   * Horizontal padding INSIDE the scrolling content — pair with a negative
   * outer margin for the full-bleed rail (mock: pills scroll to the screen
   * edge while the first/last pill still aligns with the content column).
   */
  contentPadding?: number;
  /** Rail container testID; each pill gets `${testID}-${index}`. */
  testID?: string;
};
