export type Tier = 'native' | 'custom-canvas' | 'custom-no-native' | 'infra';

export const TIERS: Record<string, Tier> = {
  'z-button': 'native',
  'z-icon-button': 'native',
  'z-select': 'native',
  'z-text-input': 'native',
  'z-textarea': 'native',
  'z-checkbox': 'native',
  'z-tabs': 'native',
  'z-card': 'native',
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
