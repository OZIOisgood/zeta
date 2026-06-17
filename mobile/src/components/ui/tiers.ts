export type Tier = 'native' | 'custom-canvas' | 'custom-no-native' | 'infra';

export const TIERS: Record<string, Tier> = {
  'z-button': 'native',
  'z-icon-button': 'native',
  // ZFab: Custom-RN, not @expo/ui. The @expo/ui ExtendedFloatingActionButton's
  // Compose Host re-reported full width on a tab-switch re-layout (the FAB grew
  // to the screen edge) — unfixable from RN. The NativeWind pill (z-fab.tsx) hugs
  // content deterministically via Yoga; z-fab.ios.tsx renders null (iOS uses a
  // nav-bar "+"). Same shape as z-list-item (Custom-RN, .tsx + .ios.tsx).
  'z-fab': 'custom-no-native',
  'z-select': 'native',
  'z-text-input': 'native',
  'z-textarea': 'native',
  'z-checkbox': 'native',
  // ZSwitch: wraps RN core `Switch` — already the platform-native control
  // (UISwitch / M3 Switch), a single cross-platform component that resolves
  // natively WITHOUT a platform split. Single shared NativeWind file (same
  // pattern as ZBadge); no .ios/.android variant needed.
  'z-switch': 'custom-no-native',
  'z-tabs': 'native',
  'z-card': 'native',
  // ZDivider: a thin separator line — no OS-widget equivalent. Single shared
  // NativeWind file (same pattern as ZBadge / ZSwitch); branches on Platform.OS
  // only for the stroke weight (1dp Android / 0.5pt iOS). Uses the `outline`
  // role token; supports a boolean or numeric `inset`.
  'z-divider': 'custom-no-native',
  'z-progress': 'native',
  // ZBadge: semantic status pill — no OS widget equivalent on either platform.
  // Single shared NativeWind implementation (no .ios/.android split needed).
  'z-badge': 'custom-no-native',
  'z-chip': 'native',
  // ZSwipeable: swipe-to-reveal trailing action (RNGH ReanimatedSwipeable). Not
  // an @expo/ui widget, but a native-gesture primitive with the full platform
  // split (.ios/.android → .shared) plus an RNGH-free bare fallback, so it
  // follows the 'native' structural contract (both platform files required).
  'z-swipeable': 'native',
  'z-dialog-panel': 'native',
  'z-confirm-dialog': 'native',
  'z-toast': 'native',
  'z-empty-state': 'native',
  'z-query-error': 'native',
  'z-combobox': 'custom-no-native',
  // ZDangerZoneCard: composition primitive — composes native sub-primitives
  // (ZCard, ZButton, ZConfirmDialog, ZIconTile) but has no platform files of
  // its own. Classified as COMPOSITION_EXCEPTION in primitive-contract.test.ts.
  'z-danger-zone-card': 'custom-no-native',
  'z-stepper': 'custom-no-native',
  // ZListItem: a list ROW — a composition (leading/title/subtitle/trailing,
  // optionally pressable via Touchable), not a single OS widget. @expo/ui
  // exposes only container List/Section (iOS) and a slot-only ListItem without
  // onPress (Android), neither of which wraps arbitrary RN leading/trailing
  // nodes → Custom-RN. It IS platform-split: the bare `.tsx` is the
  // Material/Android contract surface, and a `.ios.tsx` carries the distinct HIG
  // grouped inset-cell look. No `.android.tsx` — Metro falls back to the bare
  // `.tsx` on Android, so a separate Android file would just duplicate it. The
  // package.json moduleNameMapper block forces jest/web to resolve the bare
  // `.tsx` (the test/contract surface), avoiding jest-expo's default
  // Platform.OS='ios'. Full rationale in z-list-item.types.ts.
  'z-list-item': 'custom-no-native',
  // ZGroupedList: the inset-grouped "card + rows + hairline dividers" idiom as a
  // single primitive (embed = ZCard+map for forms; scroll = virtualized FlatList
  // for standalone lists). Composition of ZCard + ZDivider; no OS widget → a
  // single Custom-RN file.
  'z-grouped-list': 'custom-no-native',
  'z-icon-tile': 'custom-no-native',
  'z-skeleton': 'custom-no-native',
  'z-video-preview': 'custom-no-native',
  'z-avatar': 'custom-no-native',
  'z-avatar-input': 'custom-no-native',
  'z-symbol': 'native',
  'z-screen': 'infra',
  'z-keyboard-avoiding-view': 'infra',
  'z-field-label': 'infra',
  'z-field-error': 'infra',
  'touchable': 'infra',
};
