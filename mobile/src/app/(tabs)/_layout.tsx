import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTranslation } from 'react-i18next';
import { DynamicColorIOS, Platform, useColorScheme } from 'react-native';

import { useAuth } from '../../auth/auth-store';
import { accentColor, roleColor } from '../../theme/native';

/**
 * Bottom tab bar layout using expo-router NativeTabs.
 *
 * Platform behaviour:
 *  - iOS: real UITabBarController (UIKit / SwiftUI tab bar)
 *  - Android: Material 3 NavigationBar
 *
 * Tint: brand accent with proper dark-mode support via DynamicColorIOS on iOS
 * (resolves light/dark hex at OS render time); on Android a single hex value is
 * used — the M3 NavigationBar handles dark adaptation through its own theming.
 *
 * Icons: SF Symbol names on iOS / Material Symbol names on Android — pulled from
 * the same name values used in z-symbol.map.ts (no React component instantiation
 * needed; NativeTabs drives the native icon layer directly).
 *
 * Permission-gating: coaching (coaching:bookings:read) and groups (groups:read)
 * triggers are declared with hidden={true} when the user lacks the permission.
 * Using `hidden` (rather than conditional JSX) avoids a full navigator remount
 * when permissions resolve; the trigger simply does not appear in the bar.
 */

export default function TabsLayout() {
  const { t } = useTranslation();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  // Tab-bar appearance.
  //  • iOS: only the active tint is set — the native UITabBar keeps its system
  //    translucency/greys. DynamicColorIOS resolves light/dark at OS render time.
  //  • Android: the M3 NavigationBar's own dynamic defaults are cool greys
  //    (surfaceContainer bar, gray pill, onSurfaceVariant icons) that clash with the
  //    warm brand theme — and gray-pill-on-gray-bar makes the selection barely
  //    readable. Every slot is overridden with a scheme-aware warm role token.
  //    selectedIconColor/selectedLabelStyle are REQUIRED so the warm inactive
  //    iconColor/labelStyle don't bleed into the selected item
  //    (appearance.android.js resolves selected → iconColor → tintColor).
  //    The active pill uses secondaryContainer — the same warm tonal fill as the
  //    Chip / SegmentedButton / tonal-button selection language. Selected icon
  //    = onSecondaryContainer on the secondaryContainer pill; selected label
  //    = onSecondaryContainer (the label sits on the bar surface, not the pill);
  //    inactive = warm muted onSurfaceVariant.
  //    labelVisibilityMode='labeled' forces every tab to always show its label
  //    (M3 default 'selected'/'auto' hides inactive labels, which raises the active
  //    icon above the others); the handoff shows all labels aligned.
  const iosProps =
    Platform.OS === 'ios'
      ? { tintColor: DynamicColorIOS({ light: roleColor('onAccentContainer', 'light'), dark: accentColor('dark') }) }
      : {};
  const androidProps =
    Platform.OS === 'android'
      ? {
          labelVisibilityMode: 'labeled' as const,
          backgroundColor: roleColor('surface', scheme),
          indicatorColor: roleColor('secondaryContainer', scheme),
          rippleColor: roleColor('accent', scheme),
          iconColor: roleColor('onSurfaceVariant', scheme),
          selectedIconColor: roleColor('onSecondaryContainer', scheme),
          labelStyle: { color: roleColor('onSurfaceVariant', scheme) },
          selectedLabelStyle: { color: roleColor('onSecondaryContainer', scheme) },
        }
      : {};

  // Mirror the web shell nav gating (shell.component.ts):
  //   Groups       → groups:read
  //   Sessions     → coaching:bookings:read
  const permissions = useAuth((s) => s.user?.permissions ?? null);
  const has = (perm: string) => permissions !== null && permissions.includes(perm);
  const canSeeGroups = has('groups:read');
  const canSeeCoaching = has('coaching:bookings:read');

  return (
    <NativeTabs {...iosProps} {...androidProps}>
      {/* Home ─────────────────────────────────────────────────────────────── */}
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
        <NativeTabs.Trigger.Label>{t('common.nav.home')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      {/* Videos ───────────────────────────────────────────────────────────── */}
      <NativeTabs.Trigger name="videos">
        <NativeTabs.Trigger.Icon sf="video.fill" md="ondemand_video" />
        <NativeTabs.Trigger.Label>{t('common.nav.videos')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      {/* Sessions / Coaching — gated by coaching:bookings:read ───────────── */}
      <NativeTabs.Trigger name="coaching" hidden={!canSeeCoaching}>
        <NativeTabs.Trigger.Icon sf="calendar.badge.clock" md="calendar_clock" />
        <NativeTabs.Trigger.Label>{t('common.nav.sessions')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      {/* Groups — gated by groups:read ────────────────────────────────────── */}
      <NativeTabs.Trigger name="groups" hidden={!canSeeGroups}>
        <NativeTabs.Trigger.Icon sf="person.2.fill" md="group" />
        <NativeTabs.Trigger.Label>{t('common.nav.groups')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      {/* Profile / Preferences ─────────────────────────────────────────────── */}
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf="person.fill" md="person" />
        <NativeTabs.Trigger.Label>{t('preferences.title')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
