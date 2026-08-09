import { Platform } from 'react-native';

import { useRoleColors } from '../theme/native';

/**
 * Shared native large-title header options for the bottom-tab index screens
 * (Videos, Sessions, Groups, Profile). Each per-tab `_layout` spreads this and
 * adds its own `title`. Centralised so the header chrome can't drift per tab —
 * the four layouts were byte-identical duplicates, which is exactly how
 * `headerStyle.backgroundColor` came to be missing from all four at once
 * (leaving a white header band over the warm `ZScreen` body).
 *
 * A hook (not a static const): the chrome colors must follow the active color
 * scheme — the static light-only `colors` module froze the header bars light
 * in dark mode ("Dark mode flips role tokens", handoff).
 *
 * - `headerStyle.backgroundColor` = the warm screen background role so the
 *   large-title header is seamless with the body. Without it the native header
 *   defaults to white. Matches the detail screens' header bg.
 * - Brand font on the native title: native header chrome does not inherit the
 *   JS-loaded font; the `_layout.tsx` Text-render patch only reaches RN `<Text>`.
 * - `headerShadowVisible: false` on Android = M3 scroll-edge: flat at rest,
 *   elevated once content scrolls under the bar (toggled per-screen by
 *   `useHeaderScrollEdge`). iOS keeps its own large-title hairline (`undefined`).
 */
export function useTabScreenOptions() {
  const { color } = useRoleColors();
  return {
    headerLargeTitle: true,
    headerStyle: { backgroundColor: color('background') },
    headerTitleStyle: { color: color('onSurface'), fontFamily: 'NunitoSans_700Bold' },
    headerLargeTitleStyle: { color: color('onSurface'), fontFamily: 'NunitoSans_800ExtraBold' },
    headerShadowVisible: Platform.select({ android: false }),
  };
}
