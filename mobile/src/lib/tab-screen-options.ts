import { Platform } from 'react-native';

import { colors } from '../theme/colors';

/**
 * Shared native large-title header options for the bottom-tab index screens
 * (Videos, Sessions, Groups, Profile). Each per-tab `_layout` spreads this and
 * adds its own `title`. Centralised so the header chrome can't drift per tab —
 * the four layouts were byte-identical duplicates, which is exactly how
 * `headerStyle.backgroundColor` came to be missing from all four at once
 * (leaving a white header band over the warm `ZScreen` body).
 *
 * - `headerStyle.backgroundColor` = the warm screen background (`colors.bg`,
 *   #fff8f4) so the large-title header is seamless with the body. Without it the
 *   native header defaults to white. Matches the detail screens' header bg.
 * - Brand font on the native title: native header chrome does not inherit the
 *   JS-loaded font; the `_layout.tsx` Text-render patch only reaches RN `<Text>`.
 * - `headerShadowVisible: false` on Android = M3 scroll-edge: flat at rest,
 *   elevated once content scrolls under the bar (toggled per-screen by
 *   `useHeaderScrollEdge`). iOS keeps its own large-title hairline (`undefined`).
 */
export const TAB_SCREEN_OPTIONS = {
  headerLargeTitle: true,
  headerStyle: { backgroundColor: colors.bg },
  headerTitleStyle: { fontFamily: 'NunitoSans_700Bold' },
  headerLargeTitleStyle: { fontFamily: 'NunitoSans_800ExtraBold' },
  headerShadowVisible: Platform.select({ android: false }),
};
