/**
 * ZSymbol name map — logical name → platform-specific icon identifiers.
 *
 * SF Symbol names: verified against sf-symbols-typescript@2.2.0
 * Android names: verified against expo-symbols android/symbols.json
 * Lucide: lucide-react-native (web / Storybook / jest fallback)
 *
 * Flags (deviations from an exact match — noted per entry):
 *   - calendar-cog: no SF calendar+gear badge in v2.2.0; uses `calendar.badge`
 *     (generic calendar badge) on iOS. Android uses `settings` (closest intent).
 *   - camera-off: SF v2.2.0 has no `camera.slash`; maps to `video.slash` (same
 *     semantic — capture disabled). Same native glyph as `video-off` on iOS/Android;
 *     distinguish via `label` for accessibility.
 */

import {
  ArrowLeft,
  BarChart3,
  Ban,
  Bell,
  CalendarClock,
  CalendarCog,
  CalendarDays,
  CalendarOff,
  CalendarPlus,
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
  UserRound,
  Users,
  Video,
  VideoOff,
  X,
} from 'lucide-react-native';

import type { ZSymbolEntry, ZSymbolName } from './z-symbol.types';

export const SYMBOL_MAP: Record<ZSymbolName, ZSymbolEntry> = {
  // ── Navigation / chrome ────────────────────────────────────────────────────
  home: {
    sf: 'house.fill',
    android: 'home',
    lucide: Home,
  },
  back: {
    sf: 'arrow.left',
    android: 'arrow_back',
    lucide: ArrowLeft,
  },
  'chevron-left': {
    sf: 'chevron.left',
    android: 'chevron_left',
    lucide: ChevronLeft,
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

  // ── Entities ───────────────────────────────────────────────────────────────
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

  // ── Calendar variants ──────────────────────────────────────────────────────
  'calendar-days': {
    // CalendarDays: shows a view of days in a week/month.
    sf: 'calendar.day.timeline.left',
    android: 'calendar_month',
    lucide: CalendarDays,
  },
  'calendar-plus': {
    // CalendarPlus: add a new event/session.
    sf: 'calendar.badge.plus',
    android: 'calendar_add_on',
    lucide: CalendarPlus,
  },
  'calendar-cog': {
    // CalendarCog: manage/configure availability or session types.
    // SF flag: no calendar+gearshape badge in v2.2.0; `calendar.badge` is the
    // closest generic badge. Android uses `settings` (configure intent).
    sf: 'calendar.badge',
    android: 'settings',
    lucide: CalendarCog,
  },
  'calendar-off': {
    // CalendarOff: no availability / blocked period.
    sf: 'calendar.badge.exclamationmark',
    android: 'event_busy',
    lucide: CalendarOff,
  },

  // ── Status / feedback ──────────────────────────────────────────────────────
  check: {
    sf: 'checkmark',
    android: 'check',
    lucide: Check,
  },
  'check-all': {
    // CheckCheck: mark all read / all confirmed.
    sf: 'checklist.checked',
    android: 'done_all',
    lucide: CheckCheck,
  },
  'check-circle': {
    // CheckCircle2: completed / confirmed state.
    sf: 'checkmark.circle.fill',
    android: 'check_circle',
    lucide: CheckCircle2,
  },
  circle: {
    // Circle (empty): unselected / pending state (e.g. onboarding step).
    sf: 'circle',
    android: 'radio_button_unchecked',
    lucide: Circle,
  },
  'circle-alert': {
    // CircleAlert: inline field error / alert.
    sf: 'exclamationmark.circle.fill',
    android: 'error',
    lucide: CircleAlert,
  },
  warning: {
    // TriangleAlert: destructive or warning state.
    sf: 'exclamationmark.triangle.fill',
    android: 'warning',
    lucide: TriangleAlert,
  },
  info: {
    // Info: informational badge, info toast.
    sf: 'info.circle',
    android: 'info',
    lucide: Info,
  },
  'cloud-off': {
    // CloudOff: network/query error state.
    sf: 'xmark.icloud',
    android: 'cloud_off',
    lucide: CloudOff,
  },
  inbox: {
    // Inbox: empty/no-content state.
    sf: 'tray',
    android: 'inbox',
    lucide: Inbox,
  },

  // ── Actions / verbs ────────────────────────────────────────────────────────
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
  trash: {
    // Trash2: delete action.
    sf: 'trash',
    android: 'delete',
    lucide: Trash2,
  },
  edit: {
    // Pencil: edit/update action.
    sf: 'pencil',
    android: 'edit',
    lucide: Pencil,
  },
  reply: {
    // Reply: reply to a review/comment.
    sf: 'arrow.uturn.left',
    android: 'reply',
    lucide: Reply,
  },
  send: {
    // Send: submit a review/message.
    sf: 'paperplane',
    android: 'send',
    lucide: Send,
  },
  share: {
    // Share2: share via system sheet.
    sf: 'square.and.arrow.up',
    android: 'share',
    lucide: Share2,
  },
  copy: {
    // Copy: copy to clipboard (invite code, link).
    sf: 'doc.on.doc',
    android: 'content_copy',
    lucide: Copy,
  },
  link: {
    // Link: share as a link.
    sf: 'link',
    android: 'link',
    lucide: Link,
  },
  mail: {
    // Mail: invite via email.
    sf: 'envelope',
    android: 'mail',
    lucide: Mail,
  },
  'rotate-ccw': {
    // RotateCcw: retry / refresh action.
    sf: 'arrow.counterclockwise',
    android: 'rotate_left',
    lucide: RotateCcw,
  },
  save: {
    sf: 'square.and.arrow.down',
    android: 'save',
    lucide: Save,
  },

  // ── Media / call ──────────────────────────────────────────────────────────
  clock: {
    // Clock: time indicator (e.g. asset duration, review timestamp).
    sf: 'clock',
    android: 'access_time',
    lucide: Clock,
  },
  'file-video': {
    // FileVideo: upload a video file.
    sf: 'film',
    android: 'upload_file',
    lucide: FileVideo,
  },
  film: {
    // Film/Clapperboard: video content / production (reports, video count).
    sf: 'film.fill',
    android: 'movie',
    lucide: Film,
  },
  mic: {
    // Mic: microphone active in live call.
    sf: 'mic',
    android: 'mic',
    lucide: Mic,
  },
  'mic-off': {
    // MicOff: microphone muted in live call.
    sf: 'mic.slash',
    android: 'mic_off',
    lucide: MicOff,
  },
  'video-off': {
    // VideoOff: camera/video disabled in live call.
    sf: 'video.slash',
    android: 'videocam_off',
    lucide: VideoOff,
  },
  'camera-switch': {
    // SwitchCamera: flip between front/rear camera.
    sf: 'camera.rotate',
    android: 'cameraswitch',
    lucide: SwitchCamera,
  },
  'camera-off': {
    // CameraOff: camera permission denied / camera unavailable.
    // SF flag: no `camera.slash` in sf-symbols-typescript@2.2.0; `video.slash`
    // is the closest available glyph. Same native symbol as `video-off` — use
    // distinct `label` for accessibility differentiation.
    sf: 'video.slash',
    android: 'videocam_off',
    lucide: CameraOff,
  },
  phone: {
    // Phone: voice call / phone action (booking card).
    sf: 'phone',
    android: 'phone',
    lucide: Phone,
  },
  'phone-off': {
    // PhoneOff: end/leave call.
    sf: 'phone.down',
    android: 'call_end',
    lucide: PhoneOff,
  },
  ban: {
    // Ban: cancelled / not available (booking status).
    sf: 'nosign',
    android: 'block',
    lucide: Ban,
  },

  // ── Communication / notifications ─────────────────────────────────────────
  message: {
    // MessageCircle/MessageSquare: review comment, chat bubble.
    sf: 'message',
    android: 'chat',
    lucide: MessageCircle,
  },
  'qr-code': {
    // QrCode: show / scan QR code for group invite.
    sf: 'qrcode',
    android: 'qr_code',
    lucide: QrCode,
  },
  bell: {
    sf: 'bell.fill',
    android: 'notifications',
    lucide: Bell,
  },

  // ── Profile / account ──────────────────────────────────────────────────────
  'bar-chart': {
    sf: 'chart.bar.fill',
    android: 'bar_chart',
    lucide: BarChart3,
  },
  logout: {
    sf: 'rectangle.portrait.and.arrow.right',
    android: 'logout',
    lucide: LogOut,
  },
  settings: {
    // Settings: configuration / manage account.
    sf: 'gearshape',
    android: 'settings',
    lucide: Settings,
  },
  'shield-check': {
    // ShieldCheck: admin / verified / security badge (group detail).
    sf: 'checkmark.shield',
    android: 'verified_user',
    lucide: ShieldCheck,
  },
  sparkles: {
    // Sparkles: AI-enhanced / auto-generate action.
    sf: 'sparkles',
    android: 'auto_fix_high',
    lucide: Sparkles,
  },
};
