/**
 * Extra bottom padding for scrolling content on Android TAB screens that
 * render a floating action button.
 *
 * expo-router's NativeTabs (react-native-screens bottom-tabs host) lays tab
 * content ABOVE the M3 NavigationBar — uiautomator-verified: the content
 * area's bottom edge equals the bar's top edge, and the bar absorbs the
 * system gesture inset itself. Tab screens therefore need NO clearance for
 * the bar or the inset (adding it floats FABs ~80dp+ too high and leaves
 * dead space at list ends). The only thing scrolling content must clear is
 * the in-content FAB: 56dp FAB + 16dp bottom margin (M3 "list with FAB"
 * guidance), so the last row can scroll fully above it.
 */
export const ANDROID_FAB_LIST_CLEARANCE = 72;
