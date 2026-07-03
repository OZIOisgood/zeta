/**
 * ZSymbol — adaptive icon primitive (Tier: Native)
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
  ArrowLeft,
  Award,
  BarChart3,
  Ban,
  Bell,
  CalendarClock,
  CalendarCog,
  CalendarDays,
  CalendarOff,
  CalendarPlus,
  Camera,
  CameraOff,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleAlert,
  Clock,
  CloudOff,
  CloudUpload,
  Copy,
  Film,
  FileVideo,
  Home,
  Info,
  Inbox,
  Link,
  LogOut,
  Mail,
  MessageCircle,
  Mic,
  MicOff,
  Pencil,
  Phone,
  PhoneOff,
  Play,
  Plus,
  QrCode,
  Reply,
  RotateCcw,
  Save,
  Search,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  Sparkles,
  SwitchCamera,
  Trash2,
  TriangleAlert,
  Upload,
  UserRound,
  Users,
  Video,
  VideoOff,
  X,
} from 'lucide-react-native';

/** Logical icon names supported by ZSymbol. */
export type ZSymbolName =
  // Navigation / chrome
  | 'home'
  | 'back'
  | 'chevron-left'
  | 'chevron-down'
  | 'chevron-up'
  | 'chevron-right'
  | 'close'
  // Entities
  | 'video'
  | 'calendar'
  | 'users'
  | 'person'
  // Calendar variants
  | 'calendar-days'
  | 'calendar-plus'
  | 'calendar-cog'
  | 'calendar-off'
  // Status / feedback
  | 'check'
  | 'check-all'
  | 'check-circle'
  | 'circle'
  | 'circle-alert'
  | 'warning'
  | 'info'
  | 'cloud-off'
  | 'cloud-upload'
  | 'upload'
  | 'inbox'
  // Actions / verbs
  | 'plus'
  | 'search'
  | 'trash'
  | 'edit'
  | 'camera'
  | 'reply'
  | 'send'
  | 'share'
  | 'copy'
  | 'link'
  | 'mail'
  | 'rotate-ccw'
  | 'save'
  // Media / call
  | 'clock'
  | 'play'
  | 'file-video'
  | 'film'
  | 'mic'
  | 'mic-off'
  | 'video-off'
  | 'camera-switch'
  | 'camera-off'
  | 'phone'
  | 'phone-off'
  | 'ban'
  // Communication / notifications
  | 'message'
  | 'qr-code'
  | 'bell'
  // Profile / account
  | 'bar-chart'
  | 'logout'
  | 'settings'
  | 'shield-check'
  | 'award'
  | 'sparkles';

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
export type LucideIcon =
  | typeof ArrowLeft
  | typeof Award
  | typeof BarChart3
  | typeof Ban
  | typeof Bell
  | typeof CalendarClock
  | typeof CalendarCog
  | typeof CalendarDays
  | typeof CalendarOff
  | typeof CalendarPlus
  | typeof Camera
  | typeof CameraOff
  | typeof Check
  | typeof CheckCheck
  | typeof CheckCircle2
  | typeof ChevronDown
  | typeof ChevronLeft
  | typeof ChevronRight
  | typeof Circle
  | typeof CircleAlert
  | typeof Clock
  | typeof CloudOff
  | typeof CloudUpload
  | typeof Copy
  | typeof Film
  | typeof FileVideo
  | typeof Home
  | typeof Info
  | typeof Inbox
  | typeof Link
  | typeof LogOut
  | typeof Mail
  | typeof MessageCircle
  | typeof Mic
  | typeof MicOff
  | typeof Pencil
  | typeof Phone
  | typeof PhoneOff
  | typeof Play
  | typeof Plus
  | typeof QrCode
  | typeof Reply
  | typeof RotateCcw
  | typeof Save
  | typeof Search
  | typeof Send
  | typeof Settings
  | typeof Share2
  | typeof ShieldCheck
  | typeof Sparkles
  | typeof SwitchCamera
  | typeof Trash2
  | typeof TriangleAlert
  | typeof Upload
  | typeof UserRound
  | typeof Users
  | typeof Video
  | typeof VideoOff
  | typeof X;

/** Per-name mapping: SF Symbol name, Android Material Symbol name, lucide component. */
export interface ZSymbolEntry {
  /** SF Symbol name (iOS). Must be a valid SFSymbol from sf-symbols-typescript. */
  sf: string;
  /** Material Symbol name for Android (expo-symbols android/symbols.json). */
  android: string;
  /** Lucide component for web / Storybook / jest fallback. */
  lucide: LucideIcon;
}
