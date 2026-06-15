import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTranslation } from 'react-i18next';
import { DynamicColorIOS, Platform } from 'react-native';

import { useAuth } from '../../auth/auth-store';
import { accentColor } from '../../theme/native';

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

// ── Accent tint ────────────────────────────────────────────────────────────────
// DynamicColorIOS is only available on iOS; on Android we use the light hex
// (the M3 bar handles theming). In jest (defaultPlatform: 'ios') DynamicColorIOS
// is the ios variant that returns a colour object — it does not throw.
const accentTint =
  Platform.OS === 'ios'
    ? DynamicColorIOS({ light: accentColor('light'), dark: accentColor('dark') })
    : accentColor('light');

export default function TabsLayout() {
  const { t } = useTranslation();

  // Mirror the web shell nav gating (shell.component.ts):
  //   Groups       → groups:read
  //   Sessions     → coaching:bookings:read
  const permissions = useAuth((s) => s.user?.permissions ?? null);
  const has = (perm: string) => permissions !== null && permissions.includes(perm);
  const canSeeGroups = has('groups:read');
  const canSeeCoaching = has('coaching:bookings:read');

  return (
    <NativeTabs tintColor={accentTint}>
      {/* Home ─────────────────────────────────────────────────────────────── */}
      <NativeTabs.Trigger name="index">
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
