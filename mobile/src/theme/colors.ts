/**
 * Zeta design tokens as raw values, for the places NativeWind classes cannot
 * reach: icon `color` props, navigator options, placeholderTextColor.
 * Keep in sync with global.css and web/dashboard-next/src/styles.scss.
 */
export const colors = {
  bg: '#fff8ed',
  surface: '#ffffff',
  surfaceWarm: '#fff1dc',
  surfaceMuted: '#f7e4c7',
  text: '#26180f',
  muted: '#735f4d',
  primary: '#ea580c',
  primaryStrong: '#c2410c',
  primarySoft: '#fed7aa',
  accent: '#f59e0b',
  border: '#ead2b8',
  success: '#15803d',
  warning: '#b45309',
  danger: '#be123c',
  /** Icon/text on primary-colored surfaces (e.g. the FAB). */
  onPrimary: '#ffffff',
} as const;
