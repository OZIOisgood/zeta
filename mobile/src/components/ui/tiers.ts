export type Tier = 'native' | 'custom-canvas' | 'custom-no-native' | 'infra';

export const TIERS: Record<string, Tier> = {
  'z-button': 'native',
  'z-icon-button': 'native',
  'z-fab': 'native',
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
  // ZDivider: a thin separator line — no OS-widget equivalent. Custom-RN with a
  // platform split only for differing stroke widths (1dp Android / 0.5pt iOS)
  // and the iOS table-separator inset; both files use the `outline` role token.
  'z-divider': 'custom-no-native',
  'z-progress': 'native',
  // ZBadge: semantic status pill — no OS widget equivalent on either platform.
  // Single shared NativeWind implementation (no .ios/.android split needed).
  'z-badge': 'custom-no-native',
  'z-chip': 'native',
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
  // ZListItem: a pressable list ROW — a composition (Touchable + leading/title/
  // subtitle/trailing), not a single OS widget. @expo/ui exposes only container
  // List/Section (iOS) and a slot-only ListItem without onPress (Android),
  // neither of which wraps arbitrary RN leading/trailing nodes. Single shared
  // NativeWind file with Platform.OS-branched styling — same single-file
  // rationale as ZSwitch; no .ios/.android split, no moduleNameMapper block.
  'z-list-item': 'custom-no-native',
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
