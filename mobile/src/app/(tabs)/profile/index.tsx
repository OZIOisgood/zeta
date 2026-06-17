import { useEffect, useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNotificationsQuery } from '../../../api/queries/notifications';
import { NotificationBell } from '../../../components/notification-bell';
import { ZAvatar } from '../../../components/ui/z-avatar';
import { ZButton } from '../../../components/ui/z-button';
import { ZCard } from '../../../components/ui/z-card';
import { ZDivider } from '../../../components/ui/z-divider';
import { ZIconTile } from '../../../components/ui/z-icon-tile';
import { ZListItem } from '../../../components/ui/z-list-item';
import { ZScreen } from '../../../components/ui/z-screen';
import { ZSkeleton } from '../../../components/ui/z-skeleton';
import { ZSwitch } from '../../../components/ui/z-switch';
import { ZSymbol } from '../../../components/ui/z-symbol';
import { showToast } from '../../../components/ui/z-toast';
import { authStore, useAuth } from '../../../auth/auth-store';
import type { Me } from '../../../auth/auth-store';
import { colors } from '../../../theme/colors';

// Height of the NativeTabs navigation bar on Android (Material 3 NavigationBar).
// iOS auto-insets via contentInsetAdjustmentBehavior; this constant is Android-only.
const ANDROID_TAB_BAR_HEIGHT = 56;

/** Roles with a localized label under `groups.roles.*`; others render no subtitle role. */
const KNOWN_ROLES: readonly string[] = ['admin', 'expert', 'student'] as const;

function initials(user: Me): string {
  const first = user.first_name.trim()[0] ?? '';
  const last = user.last_name.trim()[0] ?? '';
  return `${first}${last}`.toUpperCase() || user.email[0]?.toUpperCase() || '';
}

function fullName(user: Me): string {
  const name = `${user.first_name} ${user.last_name}`.trim();
  return name || user.email;
}

function LoadingState() {
  const insets = useSafeAreaInsets();
  const androidPaddingBottom = Platform.OS === 'android' ? insets.bottom + ANDROID_TAB_BAR_HEIGHT : 0;
  return (
    <ZScreen edges={[]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: androidPaddingBottom }}
      >
        <View className="gap-4 p-4">
          <ZCard tone="accent" hero className="flex-row items-center gap-3">
            <ZSkeleton className="h-14 w-14 rounded-full" />
            <View className="flex-1 gap-2">
              <ZSkeleton className="h-5 w-40" />
              <ZSkeleton className="h-4 w-28" />
            </View>
          </ZCard>
          <ZCard tone="surface" className="gap-3">
            <ZSkeleton className="h-12 w-full" />
            <ZSkeleton className="h-12 w-full" />
            <ZSkeleton className="h-12 w-full" />
          </ZCard>
        </View>
      </ScrollView>
    </ZScreen>
  );
}

/**
 * Grouped-list profile overview (handoff). Local edit state lives on the pushed
 * Preferences screen; this screen only navigates and exposes the email-master
 * quick toggle. The master `notifications_enabled` switch reads from and writes
 * back to the auth store — the single source of truth shared with Preferences —
 * so toggling here persists immediately and the pushed form reads a fresh value.
 */
function ProfileOverview({ user }: { user: Me }) {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const androidPaddingBottom = Platform.OS === 'android' ? insets.bottom + ANDROID_TAB_BAR_HEIGHT : 0;

  const notifications = useNotificationsQuery();
  const unreadCount = notifications.data?.unread_count ?? 0;

  const [pendingMaster, setPendingMaster] = useState(false);

  // Header-right notification bell — present on EVERY tab screen, both platforms
  // (mirrors the handoff TopBar). Profile has no other header action, so the bell
  // is the sole trailing item. Reactive to the unread count.
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <NotificationBell unreadCount={unreadCount} onPress={() => router.push('/notifications')} />
      ),
    });
  }, [navigation, unreadCount, router]);

  const can = (permission: string) => user.permissions.includes(permission);
  const roleLabel = KNOWN_ROLES.includes(user.role) ? t(`groups.roles.${user.role}`) : '';

  // Master email toggle — fire-and-forget mutation against the shared auth
  // store. Optimistic feedback via toast; the store update keeps Profile and
  // the pushed Preferences form consistent.
  async function toggleNotifications(value: boolean) {
    setPendingMaster(true);
    const updated = await authStore.getState().updateCurrentUser({
      first_name: user.first_name,
      last_name: user.last_name,
      language: user.language,
      timezone: user.timezone,
      email_preferences: { ...user.email_preferences, notifications_enabled: value },
    });
    setPendingMaster(false);
    if (!updated) {
      showToast(t('toast.errorTitle'), t('preferences.saveFailed'), 'error');
      return;
    }
    showToast(t('toast.successTitle'), t('preferences.saveSuccess'), 'success');
  }

  // Navigation rows — each gated by the permission that fronts its destination.
  const rows: { key: string; icon: 'person' | 'bar-chart' | 'calendar-cog'; label: string; route: string; show: boolean }[] = [
    {
      key: 'personal-data',
      icon: 'person',
      label: t('preferences.personalData'),
      route: '/preferences',
      show: true,
    },
    {
      key: 'reports',
      icon: 'bar-chart',
      label: t('reports.openReport'),
      route: '/reports',
      show: can('reports:read'),
    },
    {
      key: 'availability',
      icon: 'calendar-cog',
      label: t('sessions.availability.manageTitle'),
      route: '/availability',
      show: can('coaching:availability:manage'),
    },
  ];
  const visibleRows = rows.filter((row) => row.show);

  return (
    <ZScreen edges={[]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: androidPaddingBottom }}
      >
        <View className="gap-4 p-4">
          {/* Hero — accent feature card with avatar + name + role/identity. */}
          <ZCard tone="accent" hero className="flex-row items-center gap-3">
            <ZAvatar
              image={user.avatar || undefined}
              fallback={initials(user)}
              alt={t('common.aria.avatarPreview')}
              size={56}
              shape="circle"
              tone="accent"
            />
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className="text-lg font-extrabold text-on-accent-container">
                {fullName(user)}
              </Text>
              <Text numberOfLines={1} className="mt-0.5 text-[13px] font-semibold text-on-accent-container opacity-90">
                {roleLabel || user.email}
              </Text>
            </View>
          </ZCard>

          {/* Grouped rows: one surface card, hairline dividers between rows. */}
          <ZCard tone="surface">
            {visibleRows.map((row, index) => (
              <View key={row.key}>
                {index > 0 ? <ZDivider inset /> : null}
                <ZListItem
                  leading={
                    <ZIconTile
                      tone="neutral"
                      icon={<ZSymbol name={row.icon} label={row.label} size={20} color={colors.primary} />}
                    />
                  }
                  title={row.label}
                  trailing={<ZSymbol name="chevron-right" label={row.label} size={20} color={colors.muted} />}
                  onPress={() => router.push(row.route as never)}
                />
              </View>
            ))}
            <ZDivider inset />
            <ZListItem
              leading={
                <ZIconTile
                  tone="neutral"
                  icon={<ZSymbol name="mail" label={t('preferences.emailPreferences')} size={20} color={colors.primary} />}
                />
              }
              title={t('preferences.emailPreferences')}
              trailing={
                <ZSwitch
                  checked={user.email_preferences.notifications_enabled}
                  disabled={pendingMaster}
                  accessibilityLabel={t('preferences.emailPreferences')}
                  onChange={(value) => void toggleNotifications(value)}
                />
              }
            />
          </ZCard>

          <ZButton
            label={t('common.actions.signOut')}
            variant="secondary"
            icon={<ZSymbol name="logout" label={t('common.actions.signOut')} size={16} color={colors.text} />}
            onPress={() => void authStore.getState().signOut()}
          />
        </View>
      </ScrollView>
    </ZScreen>
  );
}

export default function ProfileScreen() {
  const user = useAuth((s) => s.user);

  if (!user) return <LoadingState />;

  return <ProfileOverview key={user.id} user={user} />;
}
