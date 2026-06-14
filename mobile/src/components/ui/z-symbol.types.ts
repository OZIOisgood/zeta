/**
 * ZSymbol — adaptive icon primitive (Tier: Custom RN / Native plumbing)
 *
 * Maps a logical icon name to native iconography:
 *   - iOS  → SF Symbols via expo-symbols `SymbolView`
 *   - Android → Material Symbols via expo-symbols `SymbolView`
 *   - Web / Storybook / jest → lucide-react-native fallback
 *
 * Android uses expo-symbols' built-in Material Symbols support (dynamic font
 * loading via `SymbolView` with the `{ android: AndroidSymbol }` name shape).
 * @expo/vector-icons is NOT a dependency of this project, so we use expo-symbols
 * on Android (Material Symbols) instead of MaterialIcons.
 *
 * SF Symbol names sourced from sf-symbols-typescript@2.2.0.
 * Android symbol names sourced from expo-symbols android/symbols.json.
 */

import type {
  BarChart3,
  Bell,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  Home,
  LogOut,
  Plus,
  Save,
  Search,
  UserRound,
  Users,
  Video,
  X,
  ArrowLeft,
} from 'lucide-react-native';

/** Logical icon names supported by ZSymbol. */
export type ZSymbolName =
  | 'home'
  | 'video'
  | 'calendar'
  | 'users'
  | 'person'
  | 'back'
  | 'chevron-down'
  | 'chevron-right'
  | 'close'
  | 'check'
  | 'plus'
  | 'search'
  | 'bar-chart'
  | 'bell'
  | 'logout'
  | 'save';

export interface ZSymbolProps {
  /** Logical icon name. */
  name: ZSymbolName;
  /** Accessibility label — required for screen readers. */
  label: string;
  /** Icon size in dp/pt. Defaults to 24. */
  size?: number;
  /**
   * Semantic role color from theme/native.ts.
   * Defaults to 'onSurface' (inherits from context on iOS/Android).
   * Pass a hex string directly when using in contexts without NativeWind.
   */
  color?: string;
  testID?: string;
}

/** Lucide component type alias for the icon map. */
export type LucideIcon = typeof Home | typeof Video | typeof CalendarClock | typeof Users | typeof UserRound | typeof ArrowLeft | typeof ChevronDown | typeof ChevronRight | typeof X | typeof Check | typeof Plus | typeof Search | typeof BarChart3 | typeof Bell | typeof LogOut | typeof Save;

/** Per-name mapping: SF Symbol name, Android Material Symbol name, lucide component. */
export interface ZSymbolEntry {
  /** SF Symbol name (iOS). Must be a valid SFSymbol from sf-symbols-typescript. */
  sf: string;
  /** Material Symbol name for Android (expo-symbols android/symbols.json). */
  android: string;
  /** Lucide component for web / Storybook / jest fallback. */
  lucide: LucideIcon;
}
