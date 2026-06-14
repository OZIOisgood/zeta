/**
 * ZSymbol name map — logical name → platform-specific icon identifiers.
 *
 * SF Symbol names: verified against sf-symbols-typescript@2.2.0
 * Android names: verified against expo-symbols android/symbols.json
 * Lucide: lucide-react-native (web / Storybook / jest fallback)
 */

import {
  ArrowLeft,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  Home,
  Plus,
  Search,
  UserRound,
  Users,
  Video,
  X,
} from 'lucide-react-native';

import type { ZSymbolEntry, ZSymbolName } from './z-symbol.types';

export const SYMBOL_MAP: Record<ZSymbolName, ZSymbolEntry> = {
  home: {
    sf: 'house.fill',
    android: 'home',
    lucide: Home,
  },
  video: {
    sf: 'video.fill',
    android: 'ondemand_video',
    lucide: Video,
  },
  calendar: {
    sf: 'calendar.badge.clock',
    android: 'calendar_clock',
    lucide: CalendarClock,
  },
  users: {
    sf: 'person.2.fill',
    android: 'group',
    lucide: Users,
  },
  person: {
    sf: 'person.fill',
    android: 'person',
    lucide: UserRound,
  },
  back: {
    sf: 'arrow.left',
    android: 'arrow_back',
    lucide: ArrowLeft,
  },
  'chevron-down': {
    sf: 'chevron.down',
    android: 'expand_more',
    lucide: ChevronDown,
  },
  'chevron-right': {
    sf: 'chevron.right',
    android: 'chevron_right',
    lucide: ChevronRight,
  },
  close: {
    sf: 'xmark',
    android: 'close',
    lucide: X,
  },
  check: {
    sf: 'checkmark',
    android: 'check',
    lucide: Check,
  },
  plus: {
    sf: 'plus',
    android: 'add',
    lucide: Plus,
  },
  search: {
    sf: 'magnifyingglass',
    android: 'search',
    lucide: Search,
  },
};
